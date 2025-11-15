module.exports = {
  clientID: process.env.CLIENT_ID || "",
  clientSecret: process.env.CLIENT_SECRET || "",
  callbackURL: process.env.CALLBACK_URL || "",
  commissionFieldKey:
    process.env.COMMISSION_FIELD_KEY ||
    "1a514f40d36407ecd675c76cc539481989400ac6",
};
