# TripPilot

**Plan together. Commit together. Pay together.**

TripPilot is a working PayPal hackathon prototype for friend groups that want to plan a trip without making one person front the money. The group builds and revises one shared itinerary, privately agrees on affordability, authorises individual shares with PayPal, and books only when everyone is ready.

The repository includes a polished React judging experience, a FastAPI service, deterministic whole-cent ledger maths, a resettable Lake District demo, PayPal sandbox Order creation, and deployment configuration.

## What works

- **Shared trip workspace** with a responsive overview, persona switcher, itinerary and judge-friendly reset
- **Plan versions** created from plain-language change requests, with a visible per-person cost delta and explicit accept/reject controls
- **Group Checkout** with individual commitment caps, deadline, progress, simulated friends and final booking transition
- **Cover a friend** as a private, confirmed agreement rather than surprise debt
- **Trip tab** for shared expenses, exact whole-penny splits and compact settle-up transfers
- **Auditable agent activity** showing price checks, approvals, commitments, bookings and expense changes
- **PayPal sandbox path** that creates Orders v2 with `AUTHORIZE` intent when credentials are configured
- **Honest demo fallback** labelled `simulated sandbox` when no credentials are present
- **Responsive and accessible UI** with keyboard focus states and reduced-motion support

## Money guardrails

TripPilot follows four rules:

1. Deterministic code calculates every amount, split and balance in whole pennies.
2. A person approves every hold, charge, booking, payout and refund.
3. Nobody can create debt for another person without their confirmation.
4. Every agent action, approval and payment reference is visible in the audit trail.

## Run locally

Requirements: Node.js 22+, npm 10+, and Python 3.12+.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend remains fully usable in local demo mode if the API is not running.

### API

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
uvicorn app.main:app --app-dir apps/api --reload
```

The API runs at `http://localhost:8000`; interactive API docs are at `http://localhost:8000/docs`.

### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

## PayPal sandbox setup

The app works immediately without credentials in a clearly labelled simulation. To use PayPal sandbox Order creation:

1. Create a sandbox REST app in the PayPal Developer Dashboard.
2. Copy `.env.example` to `.env`.
3. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `VITE_PAYPAL_CLIENT_ID`.
4. Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`.
5. Restart the API and frontend.

The backend requests its own OAuth token and creates an Orders v2 order with `AUTHORIZE` intent. Secrets never belong in the frontend or Git history. This prototype does not move real money and does not claim production readiness.

## Test and build

```bash
# Frontend
cd apps/web
npm run typecheck
npm test
npm run build

# Backend
cd ../..
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests -q
```

The tests cover penny-preserving splits, zero-sum balances, settlement transfers and invalid ledger states. GitHub Actions runs both frontend and backend checks on every push and pull request.

## Demo flow for judges

1. Open **Overview** and inspect the trip, cost and one remaining commitment.
2. Open **Plan**, ask Pilot to make Sunday slower, inspect the cost delta and accept the version.
3. Open **Group checkout**, switch to Leo, and commit the final share—or use **I need help paying** to demo a private cover agreement.
4. Watch the group reach full commitment and the cabin become booked.
5. Open **Trip tab**, add an expense and inspect the recomputed settlement plan.
6. Open **Agent activity** to see every action and guardrail.
7. Use **Reset demo** to restore the starting state.

## Architecture

```text
apps/web      React + TypeScript + Vite judging experience
apps/api      FastAPI state, ledger endpoints and PayPal sandbox client
packages      Shared-domain package area
.github       CI for frontend and backend
render.yaml   Static web and Docker API deployment blueprint
```

The browser uses the API when it is available and falls back to the same seeded demo locally. The backend owns state transitions and PayPal credentials. The ledger functions are pure and tested independently.

## API summary

| Route | Purpose |
| --- | --- |
| `GET /health` | Health and payment mode |
| `GET /api/demo` | Current seeded trip state |
| `POST /api/reset` | Restore a fresh judging state |
| `POST /api/replan` | Create a bounded plan revision |
| `POST /api/commit/{member_id}` | Commit a member share and complete booking when ready |
| `POST /api/cover` | Create a private cover agreement |
| `POST /api/expenses` | Add and deterministically split an expense |
| `POST /api/paypal/orders` | Create a PayPal sandbox authorisation Order |

## Production path

For live commerce, TripPilot would add durable Postgres storage, verified PayPal webhooks, idempotent capture/void/refund endpoints, authenticated users, vendor onboarding and PayPal multiparty products. The included prototype deliberately keeps the boundary between a hackathon sandbox and real financial infrastructure explicit.

## Licence

[MIT](LICENSE)

