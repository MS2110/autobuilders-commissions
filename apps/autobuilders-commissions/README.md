# Autobuilders Commissions – Pipedrive Private App

Internal Pipedrive app that shows a **“Commissions” panel on each Deal**.

The app is a Node/Express server, hosted on Render, used only by our team.  
It authenticates with Pipedrive (OAuth) and renders an iframe panel inside the Deal view.

> This README is written so another dev/AI can understand the goal and extend the project.

---

## 1. What the app should do

For each **Deal** in Pipedrive, we want a panel that:

- Shows a **dynamic table** of commission lines.
- Each line has:
  - `Label` (e.g. Alice, Bob, Malt, Extra dev)
  - `Percent` (of total or of deposit)
  - `Fixed amount`
  - `Applies to` → `total` OR `deposit`
- Uses:
  - **Incoming revenue** (deal value)
  - **Deposit percent**
- Calculates for each line:
  - Amount on deposit
  - Amount on remaining
  - Total for that line
- Shows a warning if **sum of all lines ≠ incoming revenue**.

Data for a deal is persisted in Pipedrive (custom fields) or optionally in our own DB.

---

## 2. Tech stack

- Node.js + Express
- Pipedrive OAuth 2.0
- Pipedrive App Extensions SDK (for the Deal panel iframe)
- Hosted on [Render](https://render.com)

---

## 3. Environment variables

The server reads config from `process.env` via `config.js`:

```js
module.exports = {
  clientID: process.env.CLIENT_ID || "",
  clientSecret: process.env.CLIENT_SECRET || "",
  callbackURL: process.env.CALLBACK_URL || "",
  commissionFieldKey:
    process.env.COMMISSION_FIELD_KEY ||
    "1a514f40d36407ecd675c76cc539481989400ac6",
};
```

| Variable               | Required | Description                                                                                                           |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `CLIENT_ID`            | ✅       | OAuth client ID from the Pipedrive Developer Hub.                                                                     |
| `CLIENT_SECRET`        | ✅       | OAuth client secret.                                                                                                  |
| `CALLBACK_URL`         | ✅       | Must match the callback configured for the private app, e.g. `https://your-app.onrender.com/auth/pipedrive/callback`. |
| `COMMISSION_FIELD_KEY` | ✅       | API key of the custom deal field that stores the commission JSON payload.                                             |

### Running locally

```bash
npm install
CLIENT_ID=xxx CLIENT_SECRET=yyy CALLBACK_URL=http://localhost:3000/auth/pipedrive/callback npm run dev
```

Visit `http://localhost:3000/?dealId=<someDealId>` to render the panel, or embed `/extension/deal` in the App Extensions SDK panel inside Pipedrive. The panel fetches commission data via:

- `GET /api/deals/:dealId/commission` → reads the custom field from the Pipedrive API and returns `{ deal, summary }`.
- `PUT /api/deals/:dealId/commission` → validates/sanitises the payload, persists it back to Pipedrive, then echoes the computed summary.

If the stored OAuth tokens are missing or expired the endpoints respond with `401` and a `loginUrl` pointing to `/auth/pipedrive` so the iframe can prompt the user to reconnect.
