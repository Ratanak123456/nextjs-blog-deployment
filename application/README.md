# Fieldnotes — a simple blog for the DevOps lab

A full-stack Next.js App Router blog with PostgreSQL persistence. Browse newest-first posts at `/`, create at `/posts/new`, read at `/posts/[id]`, and edit at `/posts/[id]/edit`. Delete from the post page with confirmation. All pages include clear loading, empty, validation, not-found, success, and failure states as appropriate. Content is plain text rendered by React with line breaks preserved; there is no HTML rendering, rich-text editor, authentication, or other social functionality.

## 1. Local development

Use Node.js 24 and npm, from `application/`:

```bash
npm ci
cp .env.example .env.local
# Edit .env.local with a reachable PostgreSQL DATABASE_URL.
npm run db:migrate
# Optional, explicit example data; each invocation adds two posts:
npm run db:seed
npm run dev
```

Open http://localhost:3000. The page shell and `/api/health` work without PostgreSQL. The frontend shows a connection error until a configured, migrated database is reachable. Post operations and `/api/ready` return 503 when the database is unavailable. No build, install, or startup command migrates or seeds the database.

## 2. Application/server preparation

Existing deployment assets are one directory above: `Vagrantfile`, `justfile`, `scripts/`, `nginx/`, and `systemd/`. They were inspected and preserved. Do not recreate the prepared VM or rerun server setup for this conversion.

| Item | Existing configuration |
| --- | --- |
| VM | `app-01`, Ubuntu 22.04, `192.168.56.30` |
| Runtime | Node.js 24 and npm |
| Reverse proxy | Nginx port 80 → `127.0.0.1:3000` |
| Service/user | `nextapp.service` / `nextapp` |
| Application | `/opt/nextapp/current` |
| Environment | `/etc/nextapp/nextapp.env`, linked as `.env.production` |
| Build/start | Standard `next build`, default `.next`, regular `next start` |

No custom server, standalone output, static export, external fonts, or browser-visible DB credentials are used. Browser requests use relative `/api/posts` URLs. Data is fetched through client API requests, with no build-time database queries or enumeration of post IDs.

## 3. Teammate: file transfer and PostgreSQL setup

On the designated PostgreSQL server (PostgreSQL 14+), an administrator creates a database and role if these do not already exist. Reuse the existing database/user for a task-to-blog upgrade:

```sql
CREATE ROLE taskapp LOGIN;
-- In psql, set its password interactively:
\password taskapp
CREATE DATABASE tasklab OWNER taskapp;
```

The existing `taskapp`/`tasklab` names remain valid; no database rename is needed. Configure `listen_addresses`, a narrow `pg_hba.conf` rule using `scram-sha-256`, and the firewall for the actual app VM source address on port 5432. Supply the reachable DB host, database, user and password to the application owner.

**Host-only VMs on separate laptops cannot automatically communicate.** Put both VMs on the same host/private network, or agree on a routed/bridged connection. The DB host must be reachable from app-01. `localhost` is correct only if PostgreSQL runs on app-01.

After transferring updated source into `/vagrant/application/`, run **inside the existing app-01 VM**:

```bash
sudo systemctl stop nextapp
sudo rsync -a --chown=nextapp:nextapp \
  --exclude=node_modules --exclude=.next --exclude=.git --exclude='.env*' \
  /vagrant/application/ /opt/nextapp/current/
sudoedit /etc/nextapp/nextapp.env
```

For an upgrade, the copy above does not delete obsolete files. Remove ONLY the retired task routes/module from the deployed checkout after copying (they are intentionally absent from the new source):

```bash
sudo rm -f /opt/nextapp/current/src/app/api/tasks/route.ts \
  '/opt/nextapp/current/src/app/api/tasks/[id]/route.ts' \
  /opt/nextapp/current/src/lib/tasks.ts
```

This prevents stale task routes from entering the new build. Do not delete migration `001_tasks.sql`, the `tasks` table, existing data, environment files, or the prepared symlink. Do not copy host `node_modules` or `.next`. This remains an in-place deployment with downtime; no transfer/deployment commands were executed during implementation.

## 4. Environment configuration and explicit migrations

Use `.env.local` locally; on the VM edit `/etc/nextapp/nextapp.env` and preserve its link at `/opt/nextapp/current/.env.production` and protected permissions. The existing URL may be reused:

```dotenv
DATABASE_URL="postgresql://taskapp:URL_ENCODED_PASSWORD@REACHABLE_DB_HOST:5432/tasklab"
```

URL-encode credential characters. Escape literal `$` as `\$` for dotenv expansion. Do not source dotenv as a shell script, commit real values, or expose the URL through `NEXT_PUBLIC_*`. Avoid `.env.local` overrides on the VM.

Both migration and seed scripts explicitly load configuration using `@next/env` from the application working directory. By default they use development dotenv precedence; `NODE_ENV=production` selects production files including the `.env.production` symlink. Existing process variables take precedence; `.env.local` also overrides `.env.production`.

`npm run db:migrate` applies numbered SQL files in order. The original repeatable `migrations/001_tasks.sql` is unchanged; new `002_posts.sql` creates `posts` and its newest-first index. Reapplying these `IF NOT EXISTS` migrations preserves records. There is no automatic migration ledger; future non-repeatable migrations need explicit version tracking. Nothing drops the tasks table or copies its records into blog posts.

Run migrations only when authorized, after dependencies have been installed. Inside app-01:

```bash
sudo -u nextapp /bin/bash -c 'cd /opt/nextapp/current && NODE_ENV=production npm run db:migrate'
# Optional example posts, explicitly requested by the operator:
sudo -u nextapp /bin/bash -c 'cd /opt/nextapp/current && NODE_ENV=production npm run db:seed'
```

The seed command adds two example posts each time. It does not run migrations, erase existing posts, or run automatically. No migration or seed was executed against an existing database during implementation.

The server-only `pg` pool is reused (maximum 10 connections, 3-second connect/acquisition timeout, 5-second query/statement timeout). SQL values are parameterized; PATCH columns come from the field allowlist. Errors expose safe messages and log sanitized codes, never raw driver messages or credentials. Readiness tests access to the `posts` table, not the historical tasks table.

## 5. Production build/start using the existing justfile

From the **parent directory containing the justfile on your laptop**, after file transfer:

```bash
just stop
just build
# Run the authorized production migration from section 4 inside app-01 now.
just start
just status
just nginx-check
just check
```

`just build` refuses to rebuild an active service and runs `npm ci --include=dev` plus `npm run build` as nextapp. Builds do not need PostgreSQL. Apply `002_posts.sql` before starting to serve blog requests. Restart the service after changing environment values. For manual local production checks use `npm run build` followed by `npm start`.

## 6. Verification: UI, API, availability, persistence

```bash
# From application/:
npm run lint
npm run typecheck
npm test
npm run build
```

| Endpoint | Behavior |
| --- | --- |
| `GET /api/posts` | Newest-first summaries with `excerpt` (first 240 characters) |
| `POST /api/posts` | Create, returns full post with HTTP 201 |
| `GET /api/posts/[id]` | Retrieve full post |
| `PATCH /api/posts/[id]` | Update supplied title/content/author and updated_at |
| `DELETE /api/posts/[id]` | Delete, returns deleted ID |
| `GET /api/health` | HTTP 200 liveness without a database |
| `GET /api/ready` | HTTP 200 when posts table is accessible; otherwise 503 |

Success JSON is `{ "data": ... }`; failure JSON is `{ "error": { "message": "..." } }`. Post fields are `title` (required, trimmed, 1–200 characters), `author` (required, trimmed, 1–100), `content` (required plain text, 1–50,000, whitespace preserved but whitespace-only rejected), UUID `id`, `created_at`, and `updated_at`. PATCH ignores unsupported keys but rejects unsupported-only/empty updates. Invalid input returns 400, missing posts 404, database unavailability 503; other successful operations return 200. The retired `/api/tasks` routes are removed.

```bash
curl -i http://192.168.56.30/
curl -i http://192.168.56.30/api/health
curl -i http://192.168.56.30/api/ready
curl -i http://192.168.56.30/api/posts
curl -i http://192.168.56.30/api/posts/not-a-uuid
```

Without PostgreSQL, homepage/liveness should stay usable and the UI should explain the connection error. Readiness/posts return 503. Restore the database and click Try again. Test reading/editing a missing UUID for a post-not-found state. Test the create form with blank input and content containing literal `<script>`/HTML-looking text; it must display as text, including preserved line breaks.

For a **designated test database only**, set its URL in a dedicated test environment, apply migrations explicitly, start the app, then run:

```bash
npm run db:migrate
npm run dev
# Second terminal:
BASE_URL=http://localhost:3000 node scripts/verify-api.mjs
```

The script creates one post, retrieves it, updates all fields, retrieves persisted values through a new request, verifies list ordering/excerpts, deletes its own post, and checks missing-post responses. Use `BASE_URL=http://192.168.56.30` only when that lab database is designated for testing.

For restart persistence, create a uniquely named post in the UI, open it, edit content/author, reload, then run `just restart` from the parent directory and confirm the same ID and content remain. Cancel deletion once, then confirm deletion and reload. Check keyboard navigation, visible focus, the delete dialog's Escape/cancel behavior, and narrow-screen layouts.

No designated test database has been supplied. Real PostgreSQL CRUD, database constraints, migrations/seeding, and restart persistence remain pending until these checks run. Browser interaction and VM deployment verification must also be completed in the lab environment.

## 7. Logs

From the parent deployment directory:

```bash
just logs
# Separate Nginx proxy logs:
vagrant ssh app-01 -c "sudo tail -n 100 /var/log/nginx/nextapp.access.log"
vagrant ssh app-01 -c "sudo tail -n 100 /var/log/nginx/nextapp.error.log"
```

`just logs` reads application logs from `journalctl -u nextapp`. Nginx logs describe proxy traffic. For 502 errors inspect the service/build; for 503 blog/readiness responses check the DB URL, reachability, credentials, and posts migration. This application remains an unauthenticated local HTTP lab.

## Conversion verification results

Passed in this workspace: ESLint, `next typegen` plus `tsc --noEmit`, seven focused validation/error tests, script syntax checks, and the standard production build without PostgreSQL. Production HTTP smoke checks verified 200 responses for the homepage, create/read/edit page shells, and liveness; 503 for post reads/listing and readiness without a configured database; 400 for invalid UUIDs, malformed JSON, blank content, invalid author type, oversized content, and unsupported-only updates; and 404 for the retired task API. Post-page data/error states are loaded in the browser through API requests.

The workspace uses Node.js 26.12.0; Node.js 24, Nginx/systemd, browser interactions, and real PostgreSQL persistence still require lab verification. No migration or seed was executed. The initial type/build attempt encountered stale generated development types for retired routes; moving only that generated cache aside allowed the checks to pass.
