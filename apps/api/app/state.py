from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime


SEED = {
    "trip": {
        "id": "lake-district-26",
        "name": "Lake District Reset",
        "location": "Keswick, Lake District",
        "dates": "14–17 Nov",
        "status": "booking",
        "currency": "GBP",
        "budget_per_person": 42000,
        "version": 3,
    },
    "members": [
        {"id": "maya", "name": "Maya", "initials": "MK", "role": "Planner", "color": "coral", "committed": True},
        {"id": "alex", "name": "Alex", "initials": "AR", "role": "Planner", "color": "blue", "committed": True},
        {"id": "jordan", "name": "Jordan", "initials": "JT", "role": "Member", "color": "mint", "committed": True},
        {"id": "priya", "name": "Priya", "initials": "PS", "role": "Member", "color": "gold", "committed": True},
        {"id": "sam", "name": "Sam", "initials": "SN", "role": "Member", "color": "violet", "committed": True},
        {"id": "leo", "name": "Leo", "initials": "LW", "role": "Member", "color": "rose", "committed": False},
    ],
    "plan": [
        {"id": "stay", "day": 1, "time": "15:00", "title": "Check in · Fell House", "detail": "3 rooms · free cancellation", "type": "stay", "cents": 114000, "booked": False},
        {"id": "dinner", "day": 1, "time": "19:30", "title": "Welcome dinner", "detail": "The Round · 8 min walk", "type": "food", "cents": 16800, "booked": False},
        {"id": "catbells", "day": 2, "time": "09:30", "title": "Catbells ridge walk", "detail": "4.5 hrs · packed lunch", "type": "activity", "cents": 3600, "booked": False},
        {"id": "kayak", "day": 2, "time": "15:30", "title": "Derwentwater kayak", "detail": "2 hrs · all equipment", "type": "activity", "cents": 21600, "booked": False},
        {"id": "chill", "day": 3, "time": "10:30", "title": "Slow morning in Keswick", "detail": "Market, coffee, optional museum", "type": "rest", "cents": 9000, "booked": False},
        {"id": "castlerigg", "day": 3, "time": "15:00", "title": "Castlerigg sunset", "detail": "Private minibus · 18 min", "type": "transport", "cents": 12000, "booked": False},
    ],
    "checkout": {
        "id": "GC-2408",
        "title": "Fell House · 3 nights",
        "vendor": "Fell House Stays",
        "total_cents": 114000,
        "share_cents": 19000,
        "cap_cents": 20500,
        "deadline": "Today · 18:00",
        "state": "open",
    },
    "expenses": [
        {"id": "e1", "title": "Groceries", "payer": "maya", "amount_cents": 8674, "participants": ["maya", "alex", "jordan", "priya", "sam", "leo"], "category": "Food"},
        {"id": "e2", "title": "Minibus deposit", "payer": "alex", "amount_cents": 12000, "participants": ["maya", "alex", "jordan", "priya", "sam", "leo"], "category": "Transport"},
    ],
    "events": [
        {"id": "a1", "time": "11:42", "kind": "price", "title": "Cabin price re-checked", "detail": "£1,140 · within the £1,230 group cap"},
        {"id": "a2", "time": "11:38", "kind": "approval", "title": "Maya approved checkout", "detail": "Approval APR-72B · expires 18:00"},
        {"id": "a3", "time": "11:31", "kind": "plan", "title": "Plan v3 locked", "detail": "Added a slow morning · −£12 pp"},
    ],
}

state = deepcopy(SEED)


def reset_state() -> dict:
    global state
    state = deepcopy(SEED)
    return deepcopy(state)


def add_event(kind: str, title: str, detail: str) -> None:
    state["events"].insert(0, {
        "id": f"evt-{len(state['events']) + 1}",
        "time": datetime.now(UTC).strftime("%H:%M"),
        "kind": kind,
        "title": title,
        "detail": detail,
    })

