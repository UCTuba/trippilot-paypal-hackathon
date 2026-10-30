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


class GroupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    destination: str = Field(min_length=2, max_length=80)
    dates: str = Field(min_length=2, max_length=60)
    created_by: str = "maya"


class MessageRequest(BaseModel):
    author: str
    text: str = Field(min_length=1, max_length=600)


class VoteRequest(BaseModel):
    member_id: str
    option_id: str


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


def _group(group_id: str) -> dict:
    group = next((group for group in store.state["groups"] if group["id"] == group_id), None)
    if not group:
        raise HTTPException(404, "Group not found")
    return group


@app.post("/api/groups")
def create_group(payload: GroupRequest) -> dict:
    group_id = "-".join(payload.name.lower().split())[:40]
    if any(group["id"] == group_id for group in store.state["groups"]):
        group_id = f"{group_id}-{len(store.state['groups']) + 1}"
    group = {
        "id": group_id,
        "name": payload.name,
        "destination": payload.destination,
        "dates": payload.dates,
        "member_ids": [payload.created_by],
        "unread": 0,
        "messages": [{"id": "welcome", "author": "pilot", "kind": "summary", "time": "now", "text": "Your trip room is ready. Add the rough plan or call @pilot when you want suggestions, a summary, or a feasibility check."}],
        "polls": [],
    }
    store.state["groups"].append(group)
    return deepcopy(group)


def _pilot_reply(group: dict, text: str) -> dict:
    command = text.lower().replace("@pilot", "").strip()
    message_id = f"pilot-{len(group['messages']) + 1}"
    if any(word in command for word in ["summarise", "summarize", "summary"]):
        return {"id": message_id, "author": "pilot", "kind": "summary", "time": "now", "text": "You have agreed on Fell House, Catbells and keeping a slower Sunday. The unresolved decision is when to fit kayaking without rushing.", "meta": {"decisions": ["Fell House cabin", "Catbells on Saturday", "A slower Sunday"], "open": "Kayak timing"}}
    if any(word in command for word in ["feasible", "feasibility", "possible", "check"]):
        return {"id": message_id, "author": "pilot", "kind": "warning", "time": "now", "text": "The Saturday sequence is not feasible: the hike ends around 14:00, the kayak check-in closes at 14:30, and the transfer takes about 28 minutes. Move kayaking to Sunday or shorten the hike."}
    if any(word in command for word in ["suggest", "idea", "recommend"]):
        return {"id": message_id, "author": "pilot", "kind": "suggestion", "time": "now", "text": "Try a Sunday 10:00 kayak slot, then leave the afternoon open for Castlerigg. It keeps one relaxed morning and reduces Saturday travel by 42 minutes."}
    poll = {"id": f"poll-{len(group['polls']) + 1}", "question": "Which direction should I use for the plan?", "status": "open", "created_by": "pilot", "options": [
        {"id": "relaxed", "label": "Keep it relaxed", "votes": []},
        {"id": "active", "label": "Fit in more activities", "votes": []},
        {"id": "budget", "label": "Prioritise lower cost", "votes": []},
    ]}
    group["polls"].append(poll)
    return {"id": message_id, "author": "pilot", "kind": "poll", "time": "now", "text": "I’m not confident which trade-off the group prefers, so I opened a poll before changing the plan.", "poll_id": poll["id"]}


@app.post("/api/groups/{group_id}/messages")
def post_message(group_id: str, payload: MessageRequest) -> dict:
    group = _group(group_id)
    if payload.author != "pilot" and payload.author not in group["member_ids"]:
        raise HTTPException(403, "Author is not a group member")
    message = {"id": f"m{len(group['messages']) + 1}", "author": payload.author, "kind": "text", "time": "now", "text": payload.text}
    group["messages"].append(message)
    reply = None
    if "@pilot" in payload.text.lower():
        reply = _pilot_reply(group, payload.text)
        group["messages"].append(reply)
    return {"message": deepcopy(message), "reply": deepcopy(reply), "group": deepcopy(group)}


@app.post("/api/groups/{group_id}/polls/{poll_id}/vote")
def vote(group_id: str, poll_id: str, payload: VoteRequest) -> dict:
    group = _group(group_id)
    poll = next((poll for poll in group["polls"] if poll["id"] == poll_id), None)
    if not poll:
        raise HTTPException(404, "Poll not found")
    for option in poll["options"]:
        option["votes"] = [member for member in option["votes"] if member != payload.member_id]
    option = next((option for option in poll["options"] if option["id"] == payload.option_id), None)
    if not option:
        raise HTTPException(404, "Poll option not found")
    option["votes"].append(payload.member_id)
    total_votes = sum(len(option["votes"]) for option in poll["options"])
    if total_votes >= max(2, len(group["member_ids"]) // 2 + 1):
        winner = max(poll["options"], key=lambda row: len(row["votes"]))
        poll["status"] = "decided"
        poll["winner_id"] = winner["id"]
        if poll["id"] == "poll-kayak" and winner["id"] == "sun":
            kayak = next((item for item in store.state["plan"] if item["id"] == "kayak"), None)
            if kayak:
                kayak.update({"day": 3, "time": "10:00", "detail": "2 hrs · moved by group vote"})
            if not any(message["id"] == "vote-applied" for message in group["messages"]):
                group["messages"].append({"id": "vote-applied", "author": "pilot", "kind": "suggestion", "time": "now", "text": "Vote decided. I moved kayaking to Sunday at 10:00 and re-checked the route. The plan is feasible with a 45-minute buffer."})
    return deepcopy(poll)


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
