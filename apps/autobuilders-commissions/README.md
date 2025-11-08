# Autobuilders Commissions – Pipedrive Deal Extension

Internal tool to manage **commission breakdowns per deal** inside Pipedrive.

The app is a Node/Express web app that:

- Authenticates with Pipedrive via OAuth.
- Adds a **Deal panel** (iframe) in Pipedrive.
- Shows a **dynamic commission table** for the current deal.
- Saves commission data back to Pipedrive in a custom field (JSON).

This README is written to help another AI / dev understand the project and extend it.

---

## 1. Business Context

We receive **incoming revenue** for a mission and split it between:

- The two main partners: **65% / 35%**
- Optional third parties:
  - e.g. **Malt** (usually **10%** of the **deposit only**)
  - Extra developers or other partners

Each deal might have different:

- Incoming revenue amount
- Deposit percentage
- Number of third parties
- Percentages / fixed fees
- Whether a line applies to the **total** or only the **deposit**

We need, **per deal**:

- A quick way to edit this structure.
- A computed breakdown:
  - Amount for each party.
  - Deposit vs remaining amounts.
- A guarantee/check that the **sum of all third-party totals equals the incoming revenue.**

This should be visible directly **inside the Pipedrive deal view**.

---

## 2. High-Level Architecture

- **Stack**
  - Node.js + Express
  - Server-rendered HTML/JS (no heavy frontend framework required)
- **Hosting**
  - Render Web Service
    - `Build Command`: `npm install`
    - `Start Command`: `npm start`
- **Auth**
  - Pipedrive OAuth 2.0
  - Access token stored server-side (existing Hello-World logic)
- **Data Storage**
  - Pipedrive **Deal custom fields** (no external DB)
  - Commission configuration stored as **JSON string** in one custom field

---

## 3. Pipedrive Setup

### 3.1 App (Developer Hub)

- App type: **Private / Not published**
- OAuth scopes: at least
  - `deals:full`
  - `users:read` (optional, if we ever map lines to Pipedrive users)
- Callback URL:
  - `https://<render-service>.onrender.com/auth/pipedrive/callback`

Environment variables on Render:

```env
CLIENT_ID=<pipedrive-client-id>
CLIENT_SECRET=<pipedrive-client-secret>
CALLBACK_URL=https://<render-service>.onrender.com/auth/pipedrive/callback
```
