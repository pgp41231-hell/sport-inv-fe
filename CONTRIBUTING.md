# Beginner developer guide

This project has two GitHub repositories:

- **Frontend (this repository):** `https://github.com/pgp41231-hell/sport-inv-fe`
- **Backend/API:** `https://github.com/pgp41231-hell/spot-inv-be`

Most frontend work only needs the frontend repository. The backend repository is where new APIs are created.

## 1. First-time setup

Install these once:

1. [Git for Windows](https://git-scm.com/download/win) — lets you download and upload code with Git.
2. [Visual Studio Code](https://code.visualstudio.com/) — optional, but recommended for editing files.
3. A GitHub account with access to both repositories.

You do **not** need to install Node.js or run the app locally if your job is only to edit code with Codex/Claude and push it to GitHub.

## 2. Clone (download) the project

“Cloning” means downloading a GitHub repository to your computer so you can edit it.

1. Make a folder for your coding projects, for example `Documents\Code`.
2. Open that folder in File Explorer.
3. Right-click in empty space and choose **Open Git Bash here**, or open PowerShell/Terminal in that folder.
4. Copy and run this command:

```powershell
git clone https://github.com/pgp41231-hell/sport-inv-fe.git
```

5. Git creates a new folder named `sport-inv-fe`. Move into it:

```powershell
cd sport-inv-fe
```

6. Check that it worked:

```powershell
git status
```

You should see a message similar to `On branch main` and `nothing to commit`.

### Open the project

- **VS Code:** run `code .` in the terminal, or open VS Code → **File** → **Open Folder** → select `sport-inv-fe`.
- **ChatGPT Codex:** open the `sport-inv-fe` folder in Codex and start a task.
- **Claude Code:** open a terminal inside `sport-inv-fe`, then run `claude`.

Give either coding agent a clear task, for example:

> Read `CONTRIBUTING.md`. Add a filter to the venues page. Reuse the existing API; do not change the backend.

For a task involving both repositories, also give the agent the backend URL and this API contract:

```text
https://spot-inv-be.vercel.app/openapi.yaml
```

Never paste passwords, Supabase connection strings, Vercel secrets, or API keys into GitHub, source code, or an agent prompt.

## 3. Everyday Git workflow

Do this each time before you start work, so you receive teammates’ latest changes:

```powershell
git switch main
git pull origin main
```

Create your own branch. Replace the example name with a short description:

```powershell
git switch -c feature/venue-filter
```

Make your changes. Then check what changed:

```powershell
git status
```

Save your work as a commit:

```powershell
git add .
git commit -m "Add venue filter"
```

Upload your branch to GitHub:

```powershell
git push -u origin feature/venue-filter
```

GitHub will show a **Compare & pull request** button. Create a pull request so someone can review the changes before merging them into `main`.

## 4. How to know whether an API already exists

An API is the backend feature that gives the frontend data or performs an action. Before asking someone to create a new API, check:

1. `https://spot-inv-be.vercel.app/openapi.yaml` — the full API list.
2. `src/api.js` in this frontend — functions already ready for frontend use.
3. `spot-inv-be/src/app.js` — backend routes, only if you are working on the backend.

Common needs that are already supported:

| If you need to… | Use this API |
| --- | --- |
| Show venues | `GET /public/venues` |
| Show equipment | `GET /public/equipment` |
| Create, list, or cancel bookings | `/bookings` and `/bookings/:id/cancel` |
| Approve/reject a booking | `/approvals/:bookingId/decision` |
| Add a venue or equipment | `POST /venues` or `POST /equipment` |
| Show fixtures, tournaments, or committee contacts | `/public/matches`, `/public/tournaments`, `/public/committee` |

### Use an existing API when

- It already returns the information you need.
- It already performs the action you need.
- You only need to change how data looks, is sorted, filtered, or displayed.

In this case, update the frontend. Keep API calls in `src/api.js` and UI changes in `src/App.jsx`.

### Create a new API when

- The needed information is not returned by any current endpoint.
- The user needs to perform a new action the backend cannot do.
- The change requires storing new information in Supabase.

For a new API, change the **backend** repository as well: add the route and validation, database and memory-store support, OpenAPI documentation, and tests. Then add a matching function in the frontend’s `src/api.js`.

## 5. Developing a new feature

1. Write the user outcome in one sentence: “A requester can ___.”
2. Identify the role: requester, approver, scorekeeper, or admin.
3. Check whether the API exists using section 4.
4. Ask Codex/Claude to make the smallest change that solves the outcome.
5. Check `git status`, commit, and push your branch.
6. Open a pull request and ask for review.

## Optional: run the project locally

You only need this when you want to test the app yourself before pushing changes. Install Node.js 20+ and pnpm first.

### Frontend

```powershell
cd sport-inv-fe
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

### Backend

In a second terminal:

```powershell
cd spot-inv-be
Copy-Item .env.example .env
pnpm install
pnpm dev
```

The backend runs at `http://localhost:3000`. To make the frontend use it, set this in the frontend `.env` file:

```text
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Without local Supabase configuration, backend data is temporary. The deployed API is `https://spot-inv-be.vercel.app/api/v1`.
