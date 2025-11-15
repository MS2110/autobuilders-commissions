const knex = require("./connection");

async function createTable() {
  const tableExists = await knex.schema.hasTable("users");

  if (tableExists) {
    return;
  }

  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.text("username");
    table.text("access_token");
    table.text("refresh_token");
  });
}

async function getById(id) {
  const user = await knex.from("users").where("id", id).first();

  return user || null;
}

async function getFirst() {
  const user = await knex.from("users").orderBy("id", "asc").first();

  return user || null;
}

async function add(username, access_token, refresh_token) {
  await knex("users").insert({
    username,
    access_token,
    refresh_token,
  });
}

async function upsert(username, access_token, refresh_token) {
  const existing = await getFirst();

  if (existing) {
    await knex("users")
      .where("id", existing.id)
      .update({ username, access_token, refresh_token });
    return { ...existing, username, access_token, refresh_token };
  }

  await add(username, access_token, refresh_token);
  return getFirst();
}

module.exports = {
  createTable,
  add,
  getById,
  getFirst,
  upsert,
};
