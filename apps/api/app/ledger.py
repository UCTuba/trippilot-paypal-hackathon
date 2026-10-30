from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass


def split_cents(total: int, member_ids: list[str]) -> dict[str, int]:
    """Split whole cents deterministically; earlier IDs receive remainder cents."""
    if total < 0:
        raise ValueError("total must be non-negative")
    if not member_ids:
        raise ValueError("at least one member is required")
    ordered = sorted(member_ids)
    base, remainder = divmod(total, len(ordered))
    return {member_id: base + (index < remainder) for index, member_id in enumerate(ordered)}


@dataclass(frozen=True)
class Transfer:
    payer: str
    recipient: str
    cents: int


def settle_balances(balances: dict[str, int]) -> list[Transfer]:
    """Return a compact settlement plan for balances that sum to zero."""
    if sum(balances.values()) != 0:
        raise ValueError("balances must sum to zero")
    debtors = [[name, -amount] for name, amount in balances.items() if amount < 0]
    creditors = [[name, amount] for name, amount in balances.items() if amount > 0]
    debtors.sort(key=lambda row: row[1], reverse=True)
    creditors.sort(key=lambda row: row[1], reverse=True)
    result: list[Transfer] = []
    di = ci = 0
    while di < len(debtors) and ci < len(creditors):
        amount = min(debtors[di][1], creditors[ci][1])
        result.append(Transfer(debtors[di][0], creditors[ci][0], amount))
        debtors[di][1] -= amount
        creditors[ci][1] -= amount
        if debtors[di][1] == 0:
            di += 1
        if creditors[ci][1] == 0:
            ci += 1
    return result


def balances_from_expenses(expenses: list[dict]) -> dict[str, int]:
    balances: defaultdict[str, int] = defaultdict(int)
    for expense in expenses:
        participants = expense["participants"]
        shares = split_cents(expense["amount_cents"], participants)
        balances[expense["payer"]] += expense["amount_cents"]
        for member_id, share in shares.items():
            balances[member_id] -= share
    return dict(balances)

