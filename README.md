# Library Management System (MERN)

Production-style library system: cookie JWT auth (access + refresh rotation), role-based access (ADMIN / LIBRARIAN / MEMBER), books + physical copies with transaction-safe counters, issue/return/renew with reservation-queue awareness, fines, hourly overdue job, notifications, audit logs, dashboards, reports.

## Structure

```
library-management-system/
  server/  Express + Mongoose API (:5000)
    config/ controllers/ middleware/ models/ routes/
    validators/ utils/ jobs/ seed/ uploads/
  client/  React + Vite + Redux Toolkit + Tailwind (:5173)
    src/app store, features/, services/api.js, components/, pages/, layouts/, routes/
```

## Backend setup

```bash
cd server
npm install
cp ../.env.example ../.env
# edit ../.env: MONGO_URI (Atlas), JWT_SECRET, REFRESH_TOKEN_SECRET, CLIENT_URL
npm run dev
npm run seed   # 1 admin, 1 librarian, 5 members, 10 authors/cats, 5 pubs, 20 books + copies
```

Seed logins: `admin@library.local/Admin1234`, `librarian@library.local/Librarian1234`, `member1@library.local/Member1234`.

Key endpoints: `/api/auth`, `/users`, `/books`, `/authors`, `/categories`, `/publishers`, `/book-copies`, `/loans/issue|/:id/return|/:id/renew|/:id/mark-lost`, `/reservations`, `/fines/:id/pay|waive`, `/notifications`, `/audit-logs` (ADMIN), `/settings`, `/dashboard/admin|librarian|member|me`, `/reports/*`, `/health`.

API docs: Swagger UI at `http://localhost:5000/api/docs`, raw spec at `/api/docs.json` (source: `server/docs/openapi.js`, 48 paths).

Transactions require Atlas (replica set). Overdue cron runs hourly; mock emails go to `server/logs/emails.log`.

## Testing

```bash
cd server
npm test   # Jest + Supertest, in-memory replica set (transactions work), 13 tests
```

Covers registration/login/logout/refresh/password flows, catalog CRUD + role guards + counter consistency, issue/renew-max/overdue-fine/limit/queue rules, reservations (409 dup/cancel), fine pay/waive permissions, users/status, settings, dashboards, notifications, audit logs, reports.

## Frontend setup

```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev            # :5173 (proxies /api + /uploads to :5000)
npm run build          # production dist/
```

Axios uses `withCredentials`; 401s auto-try `POST /auth/refresh` once. Covers render from `/uploads/*` or absolute URLs with gradient fallback.

## Security checklist

- bcryptjs hashes, passwords `select:false`, never returned (`toSafeJSON()`).
- httpOnly cookies (`secure` in prod), refresh rotation via `refreshTokenHash` + `tokenVersion` bump on password change.
- Helmet, CORS with credentials, rate limits on login/register + global, mongo-sanitize, hpp, express-validator (backend authoritative) + React Hook Form frontend.
- `protect` rejects non-ACTIVE; `authorize()` enforces roles; members scoped to own loans/fines/reservations/notifications.
- Central error format `{success:false,message,error,details?}`, no stack in prod.

## Deployment notes

- Set `NODE_ENV=production`, strong `JWT_SECRET`/`REFRESH_TOKEN_SECRET`, Atlas URI, `CLIENT_URL` (comma-separated allowed).
- Serve `client/dist` via static host; point `VITE_API_URL` at API; keep cookie `SameSite=None; Secure` (already handled when `NODE_ENV=production`).
- Ensure `server/uploads/` is persistent or move to object storage; run one API instance for the cron or extract the worker.
