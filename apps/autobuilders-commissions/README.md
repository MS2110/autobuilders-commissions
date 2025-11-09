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
};
```
