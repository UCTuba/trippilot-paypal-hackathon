import pytest

from app.ledger import balances_from_expenses, settle_balances, split_cents


def test_split_preserves_every_cent():
    split = split_cents(1000, ["c", "a", "b"])
    assert split == {"a": 334, "b": 333, "c": 333}
    assert sum(split.values()) == 1000


def test_settle_balances_compacts_transfers():
    transfers = settle_balances({"maya": 2000, "alex": -1200, "leo": -800})
    assert [(t.payer, t.recipient, t.cents) for t in transfers] == [
        ("alex", "maya", 1200),
        ("leo", "maya", 800),
    ]


def test_expense_balances_sum_to_zero():
    balances = balances_from_expenses([
        {"payer": "maya", "amount_cents": 1001, "participants": ["maya", "alex", "leo"]}
    ])
    assert sum(balances.values()) == 0


def test_invalid_balances_are_rejected():
    with pytest.raises(ValueError):
        settle_balances({"maya": 100})

