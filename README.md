# FitFind

FitFind uses plain HTML, CSS and JavaScript in `frontend/`, with a Node.js and Express backend in `backend/`. The original visual is preserved, with working account forms, saved looks, favorites, preferences and mobile layout fixes.

## What works

- Register, log in, update your name and log out. Passwords are hashed; sessions are stored in MongoDB.
- Create, read, update and delete your own looks and favorites through Express APIs and the website.
- Save and fetch shopping preferences from private local JSON files through Express APIs.
- Browse a local sample product catalog, or optionally fetch an external sample catalog from DummyJSON.
- Test the APIs using the included Postman collection and environment.

Image selection still previews the image only on your device. It does not upload images or perform AI matching. Catalog prices are illustrative; local store links open store homepages. The external catalog also contains sample data, not live shopping offers.

## Run locally

You need Node.js 22 or newer and a running MongoDB database (local MongoDB Community Server or MongoDB Atlas).

1. Open a terminal in the project and install dependencies:

   ```powershell
   cd backend
   npm ci
   ```

2. A private `backend/.env` has been created in this workspace with a random session secret. On a fresh clone, create it yourself:

   ```powershell
   Copy-Item .env.example .env
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

   Paste the generated value into `SESSION_SECRET` in `.env`. The server rejects the example placeholder.

3. Set `MONGODB_URI` in `.env`. The default expects MongoDB already running locally:

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017/fitfind
   ```

   For Atlas, use your database connection string, a database user with access to the FitFind database, and an IP access rule for your server. Keep the URI private. MongoDB Compass alone is a database client; it does not run a local MongoDB server.

4. Start the application:

   ```powershell
   npm run dev
   ```

5. Open **http://localhost:3000**. Choose **Login → Create account** to register.

Express serves both the frontend and API from one origin. Do not open HTML files directly or use Live Server. Use the hostname in `APP_ORIGIN` consistently; `localhost` and `127.0.0.1` are different origins. If you change `PORT`, update `APP_ORIGIN` too.

For normal execution without automatic restarts:

```powershell
npm start
```

## Folder structure

```text
FitFind/
├── frontend/
│   ├── common.js              Shared fetch helper and account navigation
│   ├── common.css             Shared accessibility and responsive styles
│   ├── saved-items.js         Looks and favorites forms/cards
│   ├── index/                 Existing home page
│   ├── login/ and logout/     Account screens
│   ├── profile/               Profile and shopping preferences
│   ├── my-looks/              Saved looks
│   ├── favorites/             Saved favorites
│   ├── results/               Product catalog
│   └── ...                    About, features, upload and help pages
└── backend/
    ├── src/
    │   ├── server.js          Connect MongoDB, start and stop the server
    │   ├── app.js             Middleware, security, routes and static files
    │   ├── config.js          Read and validate environment variables
    │   ├── models/            MongoDB document shapes
    │   ├── routes/            Express request handlers
    │   ├── middleware/        Login requirement
    │   ├── services/          JSON file storage
    │   └── utils/             Small input validation helpers
    ├── data/products.json    Public sample catalog, served through the API
    ├── data/preferences/     Private JSON files created at runtime (ignored)
    ├── postman/              Importable collection and local environment
    ├── test/                 API and browser integration tests
    ├── .env                  Your private settings (ignored)
    ├── .env.example          Safe configuration template (committed)
    └── package-lock.json     Reproducible dependency versions
```

## How the code fits together

For example, saving a look starts in `frontend/saved-items.js`. It sends JSON to `POST /api/looks`. The server checks the session, validates the submitted fields and saves a `Look` document with the signed-in user's ID. The frontend displays the returned item.

`routes/savedItems.js` supplies the same straightforward CRUD handlers for both looks and favorites. Every query includes the logged-in user's ID, so guessing another item's ID does not grant access. The owner is assigned by the server and cannot be submitted or changed by a client.

Profile preferences use `GET /api/preferences` and `PUT /api/preferences`. They are stored in `backend/data/preferences/<user-id>.json`, outside the public frontend directory. Saves are queued per user and written to a temporary file before replacing the original, so concurrent requests do not produce partial JSON. A PUT replaces all preferences; the last completed save wins.

The old browser file picker login has been removed. Names and email addresses alone no longer count as authentication.

## Environment settings

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` locally; `production` enables secure cookies and HTTPS requirements |
| `PORT` | HTTP port for Express; defaults to `3000` |
| `APP_ORIGIN` | Exact public origin, such as `http://localhost:3000` or `https://fitfind.example.com` |
| `MONGODB_URI` | MongoDB connection string, including database name |
| `SESSION_SECRET` | Random secret with at least 32 characters; keep it stable between restarts |
| `TRUST_PROXY_HOPS` | `0` directly exposed; configure the exact number of trusted proxy hops when applicable |
| `JSON_DATA_DIR` | Private preferences directory; relative paths resolve from `backend/` |
| `ENABLE_EXTERNAL_PRODUCTS` | `true` enables the optional DummyJSON catalog; defaults to `false` |

`.gitignore` excludes real `.env` files, dependencies, generated preferences and test artifacts. It explicitly allows `.env.example`. Never put secrets in frontend JavaScript or commit exported Postman environments containing real credentials.

## API reference

Base URL: `http://localhost:3000/api`

| Method | Path | Purpose | Login required |
| --- | --- | --- | --- |
| GET | `/health` | Database readiness | No |
| POST | `/auth/register` | Create an account and session | No |
| POST | `/auth/login` | Create a session | No |
| GET | `/auth/me` | Current user's name and email | Yes |
| PATCH | `/auth/me` | Update display name | Yes |
| POST | `/auth/logout` | Destroy the session | No |
| GET | `/products` | Local sample catalog | No |
| GET | `/products?source=external` | Optional external sample catalog | No |
| GET | `/preferences` | Read JSON preferences | Yes |
| PUT | `/preferences` | Replace JSON preferences | Yes |
| GET | `/looks` or `/favorites` | List your saved items | Yes |
| POST | `/looks` or `/favorites` | Create an item | Yes |
| GET | `/looks/:id` or `/favorites/:id` | Fetch one item | Yes |
| PATCH | `/looks/:id` or `/favorites/:id` | Update allowed fields | Yes |
| DELETE | `/looks/:id` or `/favorites/:id` | Delete one item | Yes |

All write requests require these headers, including DELETE requests with an empty body:

```text
Content-Type: application/json
X-FitFind-Request: 1
```

Browsers must use the configured origin. Requests without an `Origin` header, such as Postman calls, still require the custom header. Cross-origin CORS is intentionally not enabled. Session cookies are HTTP-only; there is no bearer token to copy into JavaScript.

Registration body (password: 12 or more characters, up to 72 UTF-8 bytes):

```json
{ "name": "Your Name", "email": "you@example.com", "password": "Example-password-123" }
```

Login uses only `email` and `password`. Profile updates use `{ "name": "Updated Name" }`.

Create a look or favorite:

```json
{
  "title": "Weekend casual",
  "notes": "White tee with blue denim",
  "imageUrl": "https://example.com/outfit.jpg",
  "productUrl": "https://www.myntra.com/"
}
```

Only `title` is required (2–100 characters). Notes allow up to 1,000 characters. URLs must use HTTPS, or be empty. PATCH accepts any nonempty subset of these fields. Unknown fields are rejected. List endpoints accept `?page=1&limit=12`, with a maximum limit of 50, and return `{ items, page, limit, total }`.

Save JSON preferences:

```json
{ "style": "Casual", "stores": ["Myntra", "Amazon"] }
```

Style allows up to 100 characters. Stores allow up to 10 names, each 1–60 characters. Send `{ "style": "", "stores": [] }` to clear preferences.

Errors return `{ "error": "Readable message" }`. Common statuses are `400` invalid input, `401` login needed, `403` invalid origin/header, `404` missing item, `409` duplicate email, `413` oversized body, `415` wrong content type and `429` rate limit. Successful deletes and logout return `204` with no body.

## Use Postman

1. Start FitFind with a development MongoDB database.
2. Import both files from `backend/postman/`:
   - `FitFind.postman_collection.json`
   - `FitFind.local.postman_environment.json`
3. Select **FitFind Local** as your environment. Keep `baseUrl` free of a trailing slash.
4. Run the requests in numbered order, or use Collection Runner. Registration creates a unique example email on each run and signs in. Postman's cookie jar keeps the session; do not disable cookies.
5. Create requests save `lookId` and `favoriteId` into the environment. The following get, update and delete requests use these values automatically.
6. Check the Tests results. The collection covers success responses, invalid input, deleted items and logged-out access. The external catalog request accepts `200`, `503` when disabled or `502` when the provider is unavailable.

The collection deletes the looks and favorites it creates. It leaves its demo account and JSON preferences in the development database/storage. Use disposable demo credentials; do not run it against real user accounts.

## Optional external API

Set `ENABLE_EXTERNAL_PRODUCTS=true`, restart the backend, then choose **External sample catalog** on the results page or call `GET /api/products?source=external`.

The server fetches a fixed DummyJSON clothing category, applies a five-second timeout and caches results for five minutes. Callers cannot supply an arbitrary upstream URL. No API key is needed. Errors are shown clearly, and the local catalog remains available. External sample prices are displayed as USD; local sample prices are INR.

See the [DummyJSON product documentation](https://dummyjson.com/docs/products) for its sample dataset.

## Tests

From `backend/`:

```powershell
npm test
npm run test:ui
```

API tests run against a disposable, real MongoDB process using `mongodb-memory-server`. They do not connect to the database in `.env`. The first installation/run may download a MongoDB test binary. Tests cover CRUD, two-user isolation, session persistence and revocation, validation, JSON persistence/concurrency, private-file protection, rate limiting and external-provider success/failure cases.

Browser tests use headless Microsoft Edge on Windows. On other systems, install the test browser with `npx playwright install chromium`. To select an installed Chrome browser on Windows, set `$env:PLAYWRIGHT_CHANNEL = 'chrome'` before running the browser tests. They cover the account and saved-item flows and check all pages at a mobile width. Screenshots are written to the ignored `backend/test-results/` folder.

## Production deployment

The backend includes hashed passwords, persistent MongoDB sessions, ownership checks, validation, body limits, rate limits, origin/header checks, Helmet security headers, private API cache controls and graceful shutdown. These choices follow the [Express security guidance](https://expressjs.com/en/advanced/best-practice-security/) and [session documentation](https://expressjs.com/en/resources/middleware/session/).

For this version, deploy **one Node.js process with a persistent disk**:

1. Deploy both folders together; the backend serves `../frontend`.
2. Run `npm ci --omit=dev` in `backend/`, then `npm start` under your host's process manager.
3. Supply production environment variables through the host's secret settings. Use `NODE_ENV=production`, an HTTPS `APP_ORIGIN`, a fresh random `SESSION_SECRET` and an authenticated MongoDB connection.
4. Terminate HTTPS at a trusted reverse proxy. Set `TRUST_PROXY_HOPS` to match that topology, and prevent clients from bypassing the proxy. Secure cookies will not work over plain HTTP in production.
5. Point `JSON_DATA_DIR` to a private persistent disk directory and back it up alongside MongoDB. An ephemeral/serverless filesystem loses preferences on restart or redeployment.
6. Monitor `/api/health` and server errors. Verify account, logout and CRUD flows through the actual HTTPS URL before opening the site to users.

The JSON write queue and rate limit counters are process-local. Before running multiple workers or replicas, move preferences to shared database storage and use a shared rate limit store. This project is not configured for that deployment model. Email verification, password recovery and automatic image matching are not included.

## Troubleshooting

- **Startup cannot connect:** start MongoDB, check `MONGODB_URI`, or check Atlas network access and database credentials. The app intentionally does not run with a fake database fallback.
- **Session secret error:** replace the template value with a generated random secret.
- **403 on a write:** check `APP_ORIGIN`, use the matching website URL and include `X-FitFind-Request: 1` in Postman.
- **Login does not stay signed in:** allow cookies; use HTTPS in production and verify trusted proxy settings.
- **JSON read fails:** inspect and repair the affected private preference file or restore a backup. Corrupt JSON produces an error instead of silently becoming empty data.
- **429:** wait for the 15-minute rate limit window. General APIs allow 300 requests per IP; account endpoints additionally limit unsuccessful attempts to 10 per IP in that window.

## Team workflow

Use a feature branch, keep commits focused and run the tests before opening a pull request. Frontend changes now live under `frontend/`; backend changes live under `backend/`. Review `git status` before committing and keep `.env` private.
