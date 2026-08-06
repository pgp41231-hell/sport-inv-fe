# Startup guide

## 1. Clone and run locally

You need Node.js 20+, pnpm, and Git.

```powershell
git clone https://github.com/pgp41231-hell/spot-inv-be.git
git clone https://github.com/pgp41231-hell/sport-inv-fe.git

cd spot-inv-be
Copy-Item .env.example .env
pnpm install
pnpm dev
```

The backend starts at `http://localhost:3000`.

In a second terminal:

```powershell
cd sport-inv-fe
Copy-Item .env.example .env
# Set VITE_API_BASE_URL=http://localhost:3000/api/v1 in .env
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Local backend data is temporary unless you configure Supabase. The deployed API is `https://spot-inv-be.vercel.app/api/v1`.

## 2. Use Codex or Claude Code

Open the repository folder you are changing, then give the agent the task, acceptance criteria, and the relevant API path. For cross-repo work, also give it the other repository URL and API contract link.

- **ChatGPT Codex:** open the frontend folder, start a task, and say: “Use the Spot-InV backend contract at `https://spot-inv-be.vercel.app/openapi.yaml`; keep API calls in `src/api.js`.” Codex supports repo-local `AGENTS.md` files for durable team instructions. [Codex documentation](https://learn.chatgpt.com/docs)
- **Claude Code:** in the repository terminal, run `claude`, then give the same prompt and links. Keep project conventions in `CLAUDE.md` if your team uses Claude Code.

Never put Supabase passwords, Vercel secrets, or API keys in a prompt, source file, or committed `.env`.

## 3. Check whether an API already exists

Before adding any endpoint, check these sources in this order:

1. Backend contract: `spot-inv-be/public/openapi.yaml` or `https://spot-inv-be.vercel.app/openapi.yaml`
2. Frontend wrapper: `src/api.js`
3. Backend routes: `spot-inv-be/src/app.js`

Already supported examples:

| Need | Use |
| --- | --- |
| List public venues | `GET /public/venues` |
| List public equipment | `GET /public/equipment` |
| Create/list/cancel bookings | `/bookings` and `/bookings/:id/cancel` |
| Approve/reject a booking | `/approvals/:bookingId/decision` |
| Add venues/equipment | `POST /venues`, `POST /equipment` |
| Fixtures, tournaments, committee | `/public/matches`, `/public/tournaments`, `/public/committee` |

If the required data and action are already in the contract, **do not create another API**. Add or reuse a function in `src/api.js`, then build the UI around it.

Create a new API only when the existing contract cannot provide the data or perform the action. Add it in the backend with: route + Zod validation, both memory and Postgres store support, OpenAPI documentation, and tests. Then add the frontend wrapper and UI.

## 4. Develop a feature

1. Describe the user outcome and role (requester, approver, scorekeeper, or admin).
2. Verify the API decision above.
3. Implement UI in `src/App.jsx` and API calls only in `src/api.js`.
4. Test the happy path and errors (empty state, loading state, permission error, API failure).
5. Run:

```powershell
# frontend
pnpm build

# backend
pnpm test
```

6. Commit frontend and backend changes separately. Update `openapi.yaml` whenever backend behavior changes.
