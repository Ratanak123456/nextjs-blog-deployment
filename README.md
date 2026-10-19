# Taskboard — Next.js deployment lab

A complete App Router application in `application/`: responsive dashboard, create/edit/delete with confirmation, search and status filters, summary counts for the current filtered view, timestamps, and accessible loading/error/empty/success states. PostgreSQL is the only storage. No authentication is included for this local lab.

## 1. Local development

Use Node.js 24 and npm. From `application/`:

```bash
npm ci
cp .env.example .env.local
# Edit .env.local with a reachable PostgreSQL DATABASE_URL.
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The page and `/api/health` work without PostgreSQL; task operations and `/api/ready` return 503 until a configured, migrated database is reachable. No seed data is required or automatically inserted. No install, build, or startup hook changes the database.

## 2. Application and server preparation

Application preparation is implemented here. Existing deployment assets live one directory above: `Vagrantfile`, `justfile`, `scripts/`, `nginx/`, and `systemd/`. They were inspected and preserved. VM setup and live configuration were not run or verified during implementation.

The prepared deployment contract is Ubuntu 22.04 VM `app-01` (`192.168.56.30`), Node.js 24, user `nextapp`, source `/opt/nextapp/current`, default `.next` build, and `nextapp.service`. Nginx forwards port 80 to `127.0.0.1:3000`. The existing service runs regular `next start`; no custom server or output mode is needed. All browser API URLs are relative.

Do not recreate the already prepared VM or rerun privileged setup as part of application development. Keep existing `.vagrant` state and real environment values.

## 3. Teammate: transfer files and prepare PostgreSQL

On the designated PostgreSQL server, an administrator should create a dedicated role and database (PostgreSQL 14+):

```sql
CREATE ROLE taskapp LOGIN;
-- In psql, set its password interactively:
\password taskapp
CREATE DATABASE tasklab OWNER taskapp;
```

Configure PostgreSQL `listen_addresses` for the database interface, a narrow `pg_hba.conf` rule for the actual app VM source address using `scram-sha-256`, and the firewall to allow that source to port 5432. Reload/restart PostgreSQL as appropriate. Supply the database name, username, password and a reachable host to the application owner. The database role owns its schema; the explicit migration creates the table and index.

**Host-only VMs on separate laptops cannot automatically communicate.** Use both VMs on the same host/private network, or agree on a bridged/routed connection. Use the DB address reachable from app-01, not the other laptop's isolated host-only address. `localhost` is only correct when PostgreSQL runs on app-01.

After source is available at `/vagrant/application/`, your teammate runs the following **inside the existing app-01 VM** (these commands are documented, not executed here):

```bash
sudo systemctl stop nextapp
sudo rsync -a --chown=nextapp:nextapp \
  --exclude=node_modules --exclude=.next --exclude=.git --exclude='.env*' \
  /vagrant/application/ /opt/nextapp/current/
sudoedit /etc/nextapp/nextapp.env
```

This initial copy preserves the prepared environment link and does not delete existing files. Do not transfer host `node_modules` or `.next`. Later in-place rebuilds cause downtime.

## 4. Environment and explicit migration

Use `.env.local` locally. On the VM, `/opt/nextapp/current/.env.production` must remain linked to `/etc/nextapp/nextapp.env` with its existing protected ownership/permissions. Set:

```dotenv
DATABASE_URL="postgresql://taskapp:URL_ENCODED_PASSWORD@REACHABLE_DB_HOST:5432/tasklab"
```

URL-encode special characters in credentials, then escape any literal `$` as `\$` for Next.js dotenv expansion. Never use `NEXT_PUBLIC_DATABASE_URL`. Do not source dotenv files as shell scripts, commit credentials, or copy `.env.local` to production: it overrides `.env.production`.

Migration scripts explicitly load Next.js dotenv configuration through `@next/env`, relative to the application working directory. They default to development configuration (`.env.development.local`, `.env.local`, `.env.development`, `.env`); `NODE_ENV=production` selects `.env.production.local`, `.env.local`, `.env.production`, `.env`. Existing process variables take precedence. Avoid extra local override files on the VM.

Local migration: `npm run db:migrate`. Production migration, **after `just build` installs dependencies**, inside app-01:

```bash
sudo -u nextapp /bin/bash -c 'cd /opt/nextapp/current && NODE_ENV=production npm run db:migrate'
```

`migrations/001_tasks.sql` is repeatable with `IF NOT EXISTS`, a transaction, UUID IDs, timestamps, field constraints, and a status/date index. Reapplying preserves data; future schema changes need additional versioned migrations. No seed command is provided because an empty dashboard is intentional.

Connections use a reused server-only `pg` pool (10 connections, 3-second acquisition/connect timeout, 5-second statement/query timeouts). Readiness checks table access as well as connectivity. Database failures return safe messages and log a sanitized error code without driver messages or credentials.

## 5. Production build/start with the existing justfile

From the **parent directory containing `justfile` on your laptop**:

```bash
just stop
just build
# Teammate now runs the production migration from section 4 inside app-01.
just start
just status
just nginx-check
just check
```

`just build` refuses to rebuild an active service, runs `npm ci --include=dev` and `npm run build` as nextapp, and uses the default `.next` output. Building requires no database or external fonts. The environment must be correct before migrations; restart the service after changing runtime values. For manual local production checks: `npm run build && npm start`.

## 6. UI, API, health, readiness, and persistence tests

From `application/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

API responses are `{ "data": ... }` on success and `{ "error": { "message": "..." } }` on failure. List data is an array. Fields are title (1–200 trimmed characters), description (optional, up to 5000), status (`todo`, `in_progress`, `done`), priority (`low`, `medium`, `high`). Defaults are empty description, todo, medium. PATCH accepts only these four fields, rejects empty/unsupported-only updates, and ignores unrelated keys. IDs must be UUIDs. Invalid input returns 400, absent tasks 404, create 201, other success 200, database failures 503; unsupported HTTP methods use Next.js 405.

```bash
curl -i http://192.168.56.30/api/health
curl -i http://192.168.56.30/api/ready
curl -i 'http://192.168.56.30/api/tasks?status=todo&search=deploy'
curl -i http://192.168.56.30/api/tasks/not-a-uuid
```

Health must return 200 regardless of PostgreSQL. Readiness returns 503 when unavailable or unmigrated, 200 when usable. Stopping PostgreSQL should keep the page usable and show an explicit connection error; restore it and click Retry connection.

For an explicitly designated test database, configure its URL, migrate it, start the application against it, and run this live integration check (creates and deletes one test task):

```bash
# In a dedicated test checkout/environment, with DATABASE_URL pointing at the test database:
npm run db:migrate
npm run dev
# Second terminal; use BASE_URL=http://192.168.56.30 only when that lab database is designated for testing:
BASE_URL=http://localhost:3000 node scripts/verify-api.mjs
```

The script checks create/get/update/filter/delete across separate HTTP requests, validation and missing-task responses. For restart persistence, create a uniquely named task in the UI, edit its description/priority/status, reload, run `just restart` from the parent directory, and confirm the same task/ID remains. Search for it, filter each status, cancel deletion once, then confirm deletion and reload. Check narrow-screen layout, keyboard Tab navigation, visible focus, and Escape/cancel in the delete dialog. Counts describe the current filtered result, not all database rows.

No designated PostgreSQL test server was supplied, so live database integration and restart persistence remain unverified until these steps run. Unit tests cover validation and safe failure responses; they do not substitute for the database check.

## 7. Logs

From the parent directory on your laptop:

```bash
just logs
# Separate proxy logs:
vagrant ssh app-01 -c "sudo tail -n 100 /var/log/nginx/nextapp.access.log"
vagrant ssh app-01 -c "sudo tail -n 100 /var/log/nginx/nextapp.error.log"
```

`just logs` shows systemd application output (`journalctl -u nextapp`), not Nginx traffic. For 502 responses, check the service and application logs; for 503 task/readiness responses, check the DB URL, routing/firewall, credentials, and migration. This remains an unauthenticated HTTP local lab; access should stay within the intended lab network.

## Implementation verification

Verified in the development workspace: ESLint, generated route types plus `tsc --noEmit`, seven focused tests, a clean `npm ci --offline --ignore-scripts`, and a successful default `next build` without PostgreSQL. A production `next start` smoke check returned 200 for `/` and `/api/health`, 503 for `/api/ready` and `/api/tasks`, and 400 for malformed JSON, invalid titles/IDs/status filters, and unsupported-only PATCH fields. Builds/test execution required local worker-socket permissions in the workspace sandbox; clearing the generated failed build cache resolved its cached worker error.

The available workspace Node version was 26.12.0; target Node.js 24, the VM service, Nginx, real browser interactions, and live PostgreSQL CRUD/restart persistence still require verification on the lab environment. No VM setup, transfer, privileged deployment, or PostgreSQL installation was performed.
