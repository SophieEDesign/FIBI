# Testing

The project uses [Vitest](https://vitest.dev/) for API and smoke tests.

## Running tests

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

## Test layout

- **tests/smoke.test.ts** – Minimal sanity check that the runner works.
- **tests/api/version.test.ts** – `GET /api/version` returns 200 and a version object.
- **tests/api/admin-users.test.ts** – `GET /api/admin/users` returns 401 when no auth (mocked `requireAdmin`).
- **tests/api/places.test.ts** – `POST /api/places` returns 401 when no auth (mocked `requireUser`).

## Environment

Tests use `node` environment and dummy Supabase env in `vitest.config.ts` so route handlers that read env do not throw. Auth is mocked in admin and places tests so no real Supabase or network is required.

If you see `ERR_INTERNAL_ASSERTION` or tests hang, try Node 20 LTS or run with `--pool=threads`. Vitest 4 with Node 22 can have ESM/loader issues in some environments.
