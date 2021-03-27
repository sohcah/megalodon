"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MegalodonClientController = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const Discord = __importStar(require("discord.js"));
const url_parse_1 = __importDefault(require("url-parse"));
const psl_1 = __importDefault(require("psl"));
const speechmarkdown_js_1 = require("speechmarkdown-js");
const client_1 = require("./client");
class MegalodonClientController {
    constructor(bots, command, name, devguild, db) {
        this.auto = new Set();
        this.name = name;
        this.command = command;
        this.devguild = devguild;
        this.clients = bots.map((settings, index) => new client_1.MegalodonClient(this, settings, index === 0));
        this.db = db;
    }
    async handleMessage(message, client) {
        if (message.author.bot || message.content.startsWith(`</`))
            return;
        if (message.channel.type !== "dm" && !client.primary)
            return;
        const autoID = `${message.channel.id}_${message.author.id}`;
        if ((message.channel.type === "dm" || this.auto.has(autoID)) && !message.content.match(/^"/)) {
            const user = await this.db.get("SELECT * from users WHERE ID = ?", message.author.id);
            const { channel, client } = this.getChannel(message.author);
            if (!channel || !client) {
                message.react("🚫");
                return;
            }
            if (message.content.match(/^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)&?$/)) {
                await client.playYouTube(message.content, channel);
                return;
            }
            const ssml = this.getSSML(message, client, channel.guild, user);
            if (!ssml) {
                message.react("🚫");
                return;
            }
            await client.playSSML(ssml, channel, message.author, user);
        }
    }
    getSSML(message, client, guild, user) {
        var _a, _b, _c, _d, _e;
        const speech = new speechmarkdown_js_1.SpeechMarkdown();
        let content = message.content
            .replace(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/g, link => {
            const url = url_parse_1.default(link);
            const parsed = psl_1.default.parse(url.hostname);
            if (parsed.error) {
                return `${url.hostname} Link`;
            }
            else {
                return `${parsed.domain} Link`;
            }
        })
            .replace(/\|\|[^|]+\|\|/gi, "Spoilered Message")
            .replace(/\bcant\b/gi, "can't")
            .replace(/\bhes\b/gi, "he's")
            .replace(/\bim\b/gi, "i'm")
            .replace(/\bwasnt\b/gi, "wasn't")
            .replace(/\bwouldnt\b/gi, "wouldn't")
            .replace(/\bdidnt\b/gi, "didn't")
            .replace(/\bisnt\b/gi, "isn't")
            .replace(/\bhave?nt\b/gi, "haven't")
            .replace(/\bhasnt\b/gi, "hasn't")
            .replace(/\bhadnt\b/gi, "hadn't")
            .replace(/\batm\b/gi, "at the moment")
            .replace(/\btmrw\b/gi, "tomorrow")
            .replace(/\bidm\b/gi, "I don't mind")
            .replace(/\bidc\b/gi, "I don't care")
            .replace(/\bidk\b/gi, "I don't know")
            .replace(/\bbbl\b/gi, "be back later")
            .replace(/\bgtg\b/gi, "got to go")
            .replace(/\bwtf\b/gi, "what the (fuck)[bleep]")
            .replace(/\bcya\b/gi, "see ya")
            .replace(/\bsus\b/gi, "suss")
            .replace(/\bty\b/gi, "thank you")
            .replace(/\bttyl\b/gi, "talk to you later")
            .replace(/\bwdym\b/gi, "what do you mean")
            .replace(/\bye\b/gi, "yeah")
            .replace(/\bwb\b/gi, "welcome back")
            .replace(/\brn\b/gi, "right now")
            .replace(/\bhbu\b/gi, "how about you")
            .replace(/\btodo\b/gi, "to do")
            .replace(/\bidgaf\b/gi, "I don't give a (fuck)[bleep]")
            .replace(/\byt\b/gi, "YouTube")
            .replace(/\basap\b/gi, "as soon as possible")
            .replace(/\bville\b/gi, "Villie")
            .replace(/\b-([0-9]+)\b/gi, "minus $1")
            .replace(/🙂/g, " smile ")
            .replace(/🏳️‍🌈/g, " pride flag ");
        if (!(user === null || user === void 0 ? void 0 : user.CLIPBLOCK)) {
            content = content
                .replace(/\bdil?ligaf\b/gi, '!["https://files.thegameroom.uk/dilligaf.mp3"]')
                .replace(/\bbruh\b/gi, '!["https://files.thegameroom.uk/bruh.mp3"]')
                .replace(/\bwill_AAA\b/gi, '!["https://files.thegameroom.uk/will_scream.wav"]')
                .replace(/\bwaa+\b/gi, '!["https://files.thegameroom.uk/waa.ogg"]')
                .replace(/\bwa+h+\b/gi, '!["https://files.thegameroom.uk/waa.ogg"]');
        }
        if (content.length > 400 || (user === null || user === void 0 ? void 0 : user.BLOCK)) {
            message.channel.send("No.");
            return;
        }
        const name = (_c = (_a = user === null || user === void 0 ? void 0 : user.NAME) !== null && _a !== void 0 ? _a : (_b = message.member) === null || _b === void 0 ? void 0 : _b.displayName) !== null && _c !== void 0 ? _c : message.author.username;
        if (content === "tenor.com Link") {
            content = `${name} sent a Tenor GIF`;
        }
        else if (content === "giphy.com Link") {
            content = `${name} sent a Giphy GIF`;
        }
        else if (content.match(/tenor.com Link/)) {
            content = `${name} sent a Tenor GIF and says ${content.replace(/(giphy|tenor).com Link/g, "")}`;
        }
        else if (content.match(/giphy.com Link/)) {
            content = `${name} sent a Giphy GIF and says ${content.replace(/(giphy|tenor).com Link/g, "")}`;
        }
        else if (message.attachments.find(i => (i.height ? true : false)) && content.length > 0) {
            content = `${name} sent an image and says ${content}`;
        }
        else if (message.attachments.find(i => (i.height ? true : false))) {
            content = `${name} sent an image`;
        }
        else if (message.attachments.size > 0 && content.length > 0) {
            content = `${name} sent a file and says ${content}`;
        }
        else if (message.attachments.size > 0) {
            content = `${name} sent a file`;
        }
        else if (((_d = client.guilds.get(guild.id)) === null || _d === void 0 ? void 0 : _d.last_user) !== message.author.id ||
            (((_e = client.guilds.get(guild.id)) === null || _e === void 0 ? void 0 : _e.last_time) || 0) < Date.now() - 180000) {
            content = `${name} says ${content}`;
        }
        return speech.toSSML(content, {
            platform: "google-assistant",
        });
    }
    getChannel(user, clientDefault) {
        const channel = this.clients[0].client.channels.cache.find(c => c instanceof Discord.VoiceChannel && c.members.has(user.id));
        if (!channel)
            return {};
        let client;
        if (clientDefault) {
            client = clientDefault;
        }
        else {
            client =
                client || this.clients.find(c => { var _a; return ((_a = c.guilds.get(channel.guild.id)) === null || _a === void 0 ? void 0 : _a.last_user) === user.id; });
            client =
                client ||
                    this.clients.find(c => { var _a; return (((_a = c.guilds.get(channel.guild.id)) === null || _a === void 0 ? void 0 : _a.last_time) || 0) < Date.now() - 300000; });
            client = client || this.clients.find(c => { var _a; return channel.members.has(((_a = c.client.user) === null || _a === void 0 ? void 0 : _a.id) || ""); });
            client =
                client ||
                    this.clients.sort((a, b) => {
                        var _a, _b;
                        return (((_a = a.guilds.get(channel.guild.id)) === null || _a === void 0 ? void 0 : _a.last_time) || 0) -
                            (((_b = b.guilds.get(channel.guild.id)) === null || _b === void 0 ? void 0 : _b.last_time) || 0);
                    }).sort((a, b) => {
                        var _a, _b;
                        return (((_a = a.guilds.get(channel.guild.id)) === null || _a === void 0 ? void 0 : _a.speaking) ? 1 : 0) -
                            (((_b = b.guilds.get(channel.guild.id)) === null || _b === void 0 ? void 0 : _b.speaking) ? 1 : 0);
                    })[0];
        }
        return {
            channel: client.client.channels.resolve(channel.id),
            client,
        };
    }
    async disconnect() {
        await Promise.all(this.clients.map(i => i.disconnect()));
        return;
    }
}
exports.MegalodonClientController = MegalodonClientController;
//# sourceMappingURL=controller.js.map