const express = require("express");
const path = require("path");
const passport = require("passport");
const { Strategy } = require("passport-oauth2");

const api = require("./api");
const config = require("./config");
const User = require("./db/user");

User.createTable();

const app = express();

passport.use(
  "pipedrive",
  new Strategy(
    {
      authorizationURL: "https://oauth.pipedrive.com/oauth/authorize",
      tokenURL: "https://oauth.pipedrive.com/oauth/token",
      clientID: config.clientID || "",
      clientSecret: config.clientSecret || "",
      callbackURL: config.callbackURL || "",
    },
    async (accessToken, refreshToken, profile, done) => {
      const userInfo = await api.getUser(accessToken);
      const user = await User.add(
        userInfo.data.name,
        accessToken,
        refreshToken
      );

      done(null, user);
    }
  )
);

app.use(express.static(path.join(__dirname, "public")));
app.use(passport.initialize());
app.use(async (req, res, next) => {
  req.user = await User.getById(1);
  next();
});

const PORT = Number(process.env.PORT) || 3000;

// Allow the page to be embedded as a Pipedrive deal panel.
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

app.get("/", (req, res) => {
  res
    .type("text/plain")
    .send("Autobuilders Commissions extension stub is running.");
});

app.get("/extension/deal", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "extension-deal.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Autobuilders Commissions extension listening on port ${PORT}`);
});
