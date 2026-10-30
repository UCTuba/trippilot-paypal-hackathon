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

