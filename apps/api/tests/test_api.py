from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def setup_function():
    client.post("/api/reset")


def test_demo_is_ready_for_judging():
    response = client.get("/api/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["trip"]["location"] == "Keswick, Lake District"
    assert sum(data["balances"].values()) == 0
    assert data["mode"] == "simulated-sandbox"


def test_last_commit_books_the_cabin():
    response = client.post("/api/commit/leo")
    assert response.status_code == 200
    data = response.json()
    assert data["checkout"]["state"] == "booked"
    assert data["plan"][0]["booked"] is True
    assert data["events"][0]["title"] == "Cabin booked"


def test_replan_returns_costed_version():
    response = client.post("/api/replan", json={"prompt": "Add one chill morning"})
    assert response.status_code == 200
    assert response.json()["delta_cents"] == -1200


def test_paypal_order_is_explicitly_simulated_without_secrets():
    response = client.post("/api/paypal/orders")
    assert response.status_code == 200
    assert response.json()["simulated"] is True


def test_group_payment_becomes_ready_after_last_share():
    response = client.post("/api/payments/pay-stay/contribute", json={"member_id": "leo"})
    assert response.status_code == 200
    payment = next(item for item in response.json()["payments"] if item["id"] == "pay-stay")
    assert payment["status"] == "ready"
    assert "leo" in payment["paid_member_ids"]


def test_non_admin_cannot_pay_group_vendor():
    response = client.post("/api/payments/pay-kayak/pay-vendor", json={"member_id": "alex"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Only the group admin can pay the vendor"


def test_admin_cannot_pay_vendor_before_all_shares_arrive():
    response = client.post("/api/payments/pay-stay/pay-vendor", json={"member_id": "maya"})
    assert response.status_code == 409
    assert response.json()["detail"] == "All group shares must be received first"


def test_admin_can_pay_fully_funded_activity():
    response = client.post("/api/payments/pay-kayak/pay-vendor", json={"member_id": "maya"})
    assert response.status_code == 200
    payment = next(item for item in response.json()["payments"] if item["id"] == "pay-kayak")
    assert payment["status"] == "paid"
    kayak = next(item for item in response.json()["plan"] if item["id"] == "kayak")
    assert kayak["booked"] is True


def test_individual_payment_only_marks_that_member_paid():
    response = client.post("/api/payments/pay-flight/complete-individual", json={"member_id": "maya"})
    assert response.status_code == 200
    payment = next(item for item in response.json()["payments"] if item["id"] == "pay-flight")
    assert "maya" in payment["paid_member_ids"]
    assert "priya" not in payment["paid_member_ids"]


def test_group_chat_calls_pilot_for_a_summary():
    response = client.post("/api/groups/lake-crew/messages", json={
        "author": "maya",
        "text": "@pilot summarise what we have decided",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["reply"]["kind"] == "summary"
    assert data["reply"]["meta"]["open"] == "Kayak timing"


def test_agent_poll_vote_updates_the_shared_plan():
    response = client.post("/api/groups/lake-crew/polls/poll-kayak/vote", json={
        "member_id": "leo",
        "option_id": "sun",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "decided"
    state = client.get("/api/demo").json()
    kayak = next(item for item in state["plan"] if item["id"] == "kayak")
    assert kayak["day"] == 3
    assert kayak["time"] == "10:00"
    group = next(group for group in state["groups"] if group["id"] == "lake-crew")
    assert group["messages"][-1]["id"] == "vote-applied"


def test_new_group_starts_with_a_pilot_welcome():
    response = client.post("/api/groups", json={
        "name": "Coast Crew",
        "destination": "Cornwall",
        "dates": "First weekend in June",
    })
    assert response.status_code == 200
    assert response.json()["messages"][0]["author"] == "pilot"
