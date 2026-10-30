# Collaboration and scaling design

The hackathon build keeps state in process so it starts with no infrastructure. Its API and client models are deliberately separated at the boundaries needed to move to durable, horizontally scalable services.

## Production data model

Use Postgres as the source of truth with these core tables:

- `users`, `groups`, `group_members`
- `messages` with typed payloads for text, summaries, warnings and suggestions
- `polls`, `poll_options`, `poll_votes` with a unique `(poll_id, member_id)` constraint
- `plan_versions`, `plan_items`, `plan_changes`
- `agent_jobs`, `agent_events`, `approvals`
- `expenses`, `expense_shares`, `settlements`

Every mutable resource gets a version number. Plan updates and poll resolution use transactions plus optimistic concurrency, preventing two simultaneous decisions from silently overwriting one another.

## Realtime rooms

The HTTP API remains the durable write path. A realtime gateway broadcasts committed events to room channels such as `group:{group_id}`. WebSocket or server-sent event clients receive message, presence, vote and itinerary updates without making the realtime layer authoritative.

Reconnects use a monotonic event cursor, so clients can request events after the last one they saw. Large rooms can fan out through Redis Streams, Postgres logical events or a managed realtime service.

## Agent execution

Calling `@pilot` writes a normal member message and enqueues an `agent_job`. A worker:

1. Reads the latest room, plan and decision state.
2. Runs bounded tools for summarisation, feasibility, prices and routing.
3. Writes a typed agent message or a poll in one transaction.
4. Publishes the committed event to the room.

Jobs have idempotency keys, attempt limits and timeouts. The model never edits money or itinerary rows directly; it proposes typed changes that deterministic code validates and records.

## Poll resolution

A vote is an upsert, so each member has exactly one current choice. When a threshold is reached, one transaction locks the poll, selects the winner, creates a new plan version and emits both `poll.decided` and `plan.updated`. Replaying the same request is safe.

## Isolation and privacy

All group-scoped reads and writes require membership checks. Private affordability preferences and cover agreements live in separate tables with stricter policies; they are never included in general room context. Payment credentials remain with PayPal and server-side secrets never reach the browser.

## Deployment shape

- Static React frontend at the edge
- Stateless FastAPI instances behind a load balancer
- Managed Postgres with connection pooling
- Durable job worker for agent and reminder tasks
- Realtime event service for room fan-out
- Object storage for receipt images
- Structured logs and traces keyed by `group_id`, `job_id` and `request_id`

