"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite_1 = require("sqlite");
const sqlite3_1 = __importDefault(require("sqlite3"));
const controller_1 = require("./controller");
const path_1 = __importDefault(require("path"));
(async function () {
    const db = await sqlite_1.open({
        filename: process.env.MEGDEV ? path_1.default.resolve(__dirname, "../database.db") : "/megalodon.db",
        driver: sqlite3_1.default.Database,
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
    const controller = new controller_1.MegalodonClientController(bots.map((i, n) => (Object.assign(Object.assign({}, i), { PRIMARY: n === 0 }))), config.COMMAND, config.NAME, config.DEVGUILD, db);
    process.on("SIGINT", async () => {
        await controller.disconnect();
        process.exit();
    });
})();
//# sourceMappingURL=index.js.map