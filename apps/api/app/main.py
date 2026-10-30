from __future__ import annotations

import base64
import json
import os
from copy import deepcopy
from urllib import parse, request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import state as store
from .ledger import balances_from_expenses, settle_balances, split_cents

app = FastAPI(title="TripPilot API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https://.*\.(onrender\.com|github\.io)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReplanRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=240)


class ExpenseRequest(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    payer: str
    amount_cents: int = Field(gt=0, le=500_000)
    participants: list[str] = Field(min_length=1)
    category: str = "Other"


class CoverRequest(BaseModel):
    lender: str
    borrower: str
    amount_cents: int = Field(gt=0, le=100_000)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "paypal-sandbox" if os.getenv("PAYPAL_CLIENT_ID") else "simulated-sandbox"}


@app.get("/api/demo")
def get_demo() -> dict:
    data = deepcopy(store.state)
    balances = balances_from_expenses(data["expenses"])
    data["balances"] = balances
    data["settlements"] = [transfer.__dict__ for transfer in settle_balances(balances)]
    data["mode"] = "paypal-sandbox" if os.getenv("PAYPAL_CLIENT_ID") else "simulated-sandbox"
    return data


@app.post("/api/reset")
def reset_demo() -> dict:
    store.reset_state()
    return get_demo()


@app.post("/api/replan")
def replan(payload: ReplanRequest) -> dict:
    prompt = payload.prompt.lower()
    trip = store.state["trip"]
    trip["version"] += 1
    delta = -1200
    if "chill" in prompt or "slow" in prompt:
        summary = "Made day three slower and moved Castlerigg to sunset"
    elif "drop" in prompt or "remove" in prompt:
        summary = "Removed the requested stop and tightened the route"
        delta = -2600
    elif "food" in prompt or "dinner" in prompt:
        summary = "Added a local dinner and rebalanced the daily schedule"
        delta = 800
    else:
        summary = "Rebalanced the plan around your request"
        delta = 0
    trip["budget_per_person"] += delta
    store.add_event("plan", f"Plan v{trip['version']} proposed", f"{summary} · {delta / 100:+.0f} GBP pp")
    return {"version": trip["version"], "summary": summary, "delta_cents": delta, "trip": deepcopy(trip)}


@app.post("/api/commit/{member_id}")
def commit(member_id: str) -> dict:
    member = next((m for m in store.state["members"] if m["id"] == member_id), None)
    if not member:
        raise HTTPException(404, "Member not found")
    if member["committed"]:
        return get_demo()
    member["committed"] = True
    store.add_event("payment", f"{member['name']} committed", "PayPal authorization · up to £205")
    if all(member["committed"] for member in store.state["members"]):
        store.state["checkout"]["state"] = "booked"
        store.state["plan"][0]["booked"] = True
        store.add_event("booking", "Cabin booked", "All commitments collected · mock vendor confirmation FH-8842")
    return get_demo()


@app.post("/api/cover")
def cover(payload: CoverRequest) -> dict:
    members = {m["id"]: m for m in store.state["members"]}
    if payload.lender not in members or payload.borrower not in members:
        raise HTTPException(404, "Member not found")
    borrower = members[payload.borrower]
    borrower["committed"] = True
    store.add_event(
        "cover",
        f"{members[payload.lender]['name']} covered {borrower['name']}",
        f"Private agreement · £{payload.amount_cents / 100:.2f} · due 29 Nov",
    )
    return get_demo()


@app.post("/api/expenses")
def add_expense(payload: ExpenseRequest) -> dict:
    known = {m["id"] for m in store.state["members"]}
    if payload.payer not in known or any(member not in known for member in payload.participants):
        raise HTTPException(400, "Unknown member")
    shares = split_cents(payload.amount_cents, payload.participants)
    expense = {"id": f"e{len(store.state['expenses']) + 1}", **payload.model_dump()}
    store.state["expenses"].append(expense)
    store.add_event("expense", f"{payload.title} added", f"£{payload.amount_cents / 100:.2f} · split {len(shares)} ways")
    return get_demo()


def _paypal_token() -> str:
    client_id = os.getenv("PAYPAL_CLIENT_ID")
    secret = os.getenv("PAYPAL_CLIENT_SECRET")
    if not client_id or not secret:
        raise HTTPException(503, "PayPal sandbox credentials are not configured")
    base = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
    credentials = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
    req = request.Request(
        f"{base}/v1/oauth2/token",
        data=parse.urlencode({"grant_type": "client_credentials"}).encode(),
        headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with request.urlopen(req, timeout=12) as response:
        return json.loads(response.read())["access_token"]


@app.post("/api/paypal/orders")
def create_paypal_order() -> dict:
    if not os.getenv("PAYPAL_CLIENT_ID"):
        return {"id": "SIMULATED-ORDER-GC-2408", "status": "CREATED", "simulated": True}
    base = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
    body = {
        "intent": "AUTHORIZE",
        "purchase_units": [{
            "reference_id": store.state["checkout"]["id"],
            "description": store.state["checkout"]["title"],
            "amount": {"currency_code": "GBP", "value": f"{store.state['checkout']['share_cents'] / 100:.2f}"},
        }],
    }
    req = request.Request(
        f"{base}/v2/checkout/orders",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {_paypal_token()}", "Content-Type": "application/json", "PayPal-Request-Id": f"trippilot-{store.state['checkout']['id']}"},
        method="POST",
    )
    with request.urlopen(req, timeout=12) as response:
        return json.loads(response.read())

