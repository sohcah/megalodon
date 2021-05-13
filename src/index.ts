import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { MegalodonClientController } from "./controller";
import path from "path";

(async function () {
  const db = await open({
    filename: process.env.MEGDEV ? path.resolve(__dirname, "../database.db") : "/megalodon.db",
    driver: sqlite3.Database,
  });
  await db.run(`CREATE TABLE if not exists users(
    ID CHAR(20) PRIMARY KEY NOT NULL,
    NAME TEXT NOT NULL,
    PRONOUN CHAR(1),
    VOICE CHAR(20),
    PITCH DOUBLE,
    RATE DOUBLE,
    BLOCK BOOL,
    CLIPBLOCK BOOL
  )`);
  await db.run(`CREATE TABLE if not exists bots(
    NAME TEXT PRIMARY KEY NOT NULL,
    TOKEN CHAR(65) NOT NULL,
    VOICE CHAR(20) NOT NULL,
    VOICE_F CHAR(20) NOT NULL,
    VOICE_M CHAR(20) NOT NULL,
    PITCH DOUBLE
  );`);
  await db.run(`CREATE TABLE if not exists config(
    NAME TEXT PRIMARY KEY NOT NULL,
    COMMAND CHAR(32) NOT NULL,
    DEVGUILD CHAR(20) NOT NULL
  );`);
  const bots = await db.all("SELECT * FROM bots");
  const config = await db.get("SELECT * FROM config LIMIT 1");
  if (!config) {
    console.error("🛑 Missing data in `config` table");
    process.exit();
  }
  if (bots.length === 0) {
    console.error("🛑 Missing data in `bots` table");
    process.exit();
  }
  const controller = new MegalodonClientController(
    bots.map((i, n) => ({ ...i, PRIMARY: n === 0 })),
    config.COMMAND,
    config.NAME,
    config.DEVGUILD,
    db
  );
  process.on("SIGINT", async () => {
    await controller.disconnect();
    process.exit();
  });
})();
