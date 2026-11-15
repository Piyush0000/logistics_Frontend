# Admin panel: what it needs from the backend

The admin panel runs on sample data until these exist. Every item was checked against `Evoc_ships` at `aace603`. The general connection gaps (login, the gateway, shapes) are in [../backend-connection-gaps.md](../backend-connection-gaps.md).

## 1. An admin credential the gateway accepts

Admin routes must not accept a merchant token.

**Needed:** an admin token, or a separate admin API key, and gateway routes under `/api/v1/admin/*` that check it and call the internal services with their internal keys. Without a merchant id, those calls cover every merchant.

## 2. Routes that already exist in a service but not in the gateway

| Admin section | Service route today | Admin route needed |
|---|---|---|
| Overview, Shipments | order-engine `GET /v1/shipments` and `/v1/shipments/stats` (internal key; all merchants when `x-merchant-id` is left out) | `GET /api/v1/admin/shipments`, `/admin/shipments/stats` |
| Shipments (stuck) | tracking-engine `GET /v1/shipments/stuck`, `/stuck/stats` | `GET /api/v1/admin/shipments/stuck` |
| Money: wallets | ledger-engine `GET /v1/wallet` (per merchant, internal key + `x-merchant-id`) | List of every wallet; per-merchant ledger; credit and debit with reason |
| Money: COD | reconciliation `remittances`, `remittances/:id`, `reconcile`, `verify-bank`, `overdue`, `summary`, `exceptions`, `exceptions/:id/resolve` | The same, under `/api/v1/admin/cod/*`. Reconciliation also needs guards (its routes have none) and a port that doesn't clash with webhooks (both default to 3004). |
| System: webhooks | webhooks `GET /deliveries/support`, `/deliveries/support/:id` (operator key `WEBHOOK_SUPPORT_KEYS`), `POST /deliveries/:id/retry` | `GET /api/v1/admin/webhooks/failures`, retry |
| Pricing | order-engine `RateCard` table (no route) | Read and update rate card rows; courier on and off |
| System: health | Each service's `/health` | `GET /api/v1/admin/health`, gathering every service's health |

## 3. No backend support at all yet

- **Merchants:** a merchant record (profile, status, GSTIN), list and search, and suspend or reactivate.
- **Onboarding and KYC:** applications, document storage, and approve or reject with a reason.
- **Support:** tickets, threads and replies.
- **Audit log:** storing who changed what and when (or the frontend can keep it once a store exists).
- **Per-merchant price overrides.**
