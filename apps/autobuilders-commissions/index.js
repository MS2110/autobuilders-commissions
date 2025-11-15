const express = require("express");
const path = require("path");
const passport = require("passport");
const { Strategy } = require("passport-oauth2");

const api = require("./api");
const config = require("./config");
const User = require("./db/user");

const PORT = Number(process.env.PORT) || 3000;
const AUTH_SCOPES =
  process.env.PIPEDRIVE_SCOPES || "deals:full deals:read users:read";
const COMMISSION_FIELD_KEY = config.commissionFieldKey;
const HAS_OAUTH_CONFIG = Boolean(
  config.clientID && config.clientSecret && config.callbackURL
);
const scopeList = AUTH_SCOPES.split(/[\s,]+/).filter(Boolean);

const app = express();

// Prepare the in-memory database table for OAuth tokens.
User.createTable().catch((error) => {
  console.error("Failed to prepare database", error);
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Allow the page to be embedded as a Pipedrive deal panel.
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

if (HAS_OAUTH_CONFIG) {
  passport.use(
    "pipedrive",
    new Strategy(
      {
        authorizationURL: "https://oauth.pipedrive.com/oauth/authorize",
        tokenURL: "https://oauth.pipedrive.com/oauth/token",
        clientID: config.clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
        scope: scopeList,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userInfo = await api.getUser(accessToken);
          const storedUser = await User.upsert(
            userInfo?.data?.name || "Pipedrive user",
            accessToken,
            refreshToken
          );

          done(null, storedUser);
        } catch (error) {
          done(error);
        }
      }
    )
  );
} else {
  console.warn(
    "Pipedrive OAuth credentials are not configured. Set CLIENT_ID, CLIENT_SECRET, and CALLBACK_URL to enable authentication."
  );
}

app.use(passport.initialize());

// Load the single stored installation user (if any).
app.use(async (req, res, next) => {
  try {
    req.installationUser = await User.getFirst();
    next();
  } catch (error) {
    next(error);
  }
});

function ensureOAuthConfigured(res) {
  if (HAS_OAUTH_CONFIG) {
    return true;
  }

  res
    .status(500)
    .send(
      "Server missing CLIENT_ID/CLIENT_SECRET/CALLBACK_URL environment variables."
    );
  return false;
}

function requireAuthorization(req, res) {
  if (req.installationUser && req.installationUser.access_token) {
    return req.installationUser;
  }

  res.status(401).json({
    error: "Authorization required",
    loginUrl: "/auth/pipedrive",
  });
  return null;
}

function sanitizeCommissionConfig(rawConfig) {
  if (!Array.isArray(rawConfig)) {
    return [];
  }

  return rawConfig
    .map((entry, index) => {
      if (!entry) return null;

      const appliesTo =
        entry.appliesTo === "deposit"
          ? "deposit"
          : entry.appliesTo === "remaining"
          ? "remaining"
          : "total";

      return {
        id: entry.id || `line-${index + 1}`,
        name: String(entry.name || `Line ${index + 1}`),
        appliesTo,
        percent: Number(entry.percent) || 0,
        fixed: Number(entry.fixed) || 0,
      };
    })
    .filter(Boolean);
}

function parseStoredSummary(rawValue, dealValue) {
  const fallback = {
    commissionConfig: [],
    depositPercent: 0,
    dealValue: Number(dealValue) || 0,
  };

  if (!rawValue) {
    return fallback;
  }

  try {
    const parsed =
      typeof rawValue === "string" && rawValue.trim().length
        ? JSON.parse(rawValue)
        : rawValue;

    return {
      commissionConfig: sanitizeCommissionConfig(parsed?.commissionConfig),
      depositPercent: Math.max(
        0,
        Math.min(100, Number(parsed?.depositPercent) || 0)
      ),
      dealValue: Number(parsed?.dealValue || dealValue) || fallback.dealValue,
    };
  } catch (error) {
    console.warn("Failed to parse commission summary", error);
    return fallback;
  }
}

async function fetchDeal(dealId, accessToken) {
  const result = await api.getDealById(dealId, accessToken);
  if (!result || !result.data) {
    throw new Error("Deal not found");
  }
  return result.data;
}

function respondWithDealSummary(res, deal, summary) {
  res.json({
    deal,
    summary: {
      commissionConfig: summary.commissionConfig,
      depositPercent: summary.depositPercent,
      dealValue: summary.dealValue,
    },
  });
}

app.get("/", (req, res) => {
  res.render("commission-panel", {
    panelProps: JSON.stringify({
      dealId: req.query.dealId || null,
      selectedIds: req.query.selectedIds
        ? String(req.query.selectedIds)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [],
    }),
  });
});

app.get("/auth/pipedrive", (req, res, next) => {
  if (!ensureOAuthConfigured(res)) {
    return;
  }

  passport.authenticate("pipedrive", {
    session: false,
    scope: scopeList,
  })(req, res, next);
});

app.get("/auth/pipedrive/callback", (req, res, next) => {
  if (!ensureOAuthConfigured(res)) {
    return;
  }

  passport.authenticate("pipedrive", {
    session: false,
    failureRedirect: "/auth/error",
  })(req, res, (err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/auth/success");
  });
});

app.get("/auth/success", (req, res) => {
  res.send(
    "<p>Authorization successful. You can close this window and reload the panel.</p>"
  );
});

app.get("/auth/error", (req, res) => {
  res.status(500).send("Failed to authorize with Pipedrive.");
});

app.get("/auth/status", async (req, res) => {
  res.json({ authenticated: Boolean(req.installationUser) });
});

app.get("/extension/deal", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "extension-deal.html"));
});

app.get("/api/deals/:dealId/commission", async (req, res, next) => {
  const user = requireAuthorization(req, res);
  if (!user) {
    return;
  }

  try {
    const deal = await fetchDeal(req.params.dealId, user.access_token);
    const storedSummary = parseStoredSummary(
      deal[COMMISSION_FIELD_KEY],
      deal.value
    );
    respondWithDealSummary(res, deal, storedSummary);
  } catch (error) {
    next(error);
  }
});

app.put("/api/deals/:dealId/commission", async (req, res, next) => {
  const user = requireAuthorization(req, res);
  if (!user) {
    return;
  }

  const incomingConfig = sanitizeCommissionConfig(req.body?.commissionConfig);
  const depositPercent = Math.max(
    0,
    Math.min(100, Number(req.body?.depositPercent) || 0)
  );

  try {
    const deal = await fetchDeal(req.params.dealId, user.access_token);
    const summary = {
      commissionConfig: incomingConfig,
      depositPercent,
      dealValue: Number(deal.value) || 0,
    };

    await api.updateDealFields(
      req.params.dealId,
      {
        [COMMISSION_FIELD_KEY]: JSON.stringify(summary),
      },
      user.access_token
    );

    respondWithDealSummary(res, deal, summary);
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, "public")));

// Generic error handler so the panel shows actionable errors.
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: err?.message || "Unexpected server error",
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Autobuilders Commissions extension listening on port ${PORT}`);
  });
}

module.exports = app;
