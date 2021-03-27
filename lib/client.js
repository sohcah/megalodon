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
exports.MegalodonClient = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const Discord = __importStar(require("discord.js"));
const to_readable_stream_1 = __importDefault(require("to-readable-stream"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const path_1 = __importDefault(require("path"));
// Setup GC TTS
const text_to_speech_1 = __importDefault(require("@google-cloud/text-to-speech"));
const ttsClient = new text_to_speech_1.default.TextToSpeechClient({
    keyFile: path_1.default.resolve(__dirname, "../serviceaccount.json"),
});
class MegalodonClient {
    constructor(controller, settings, primary) {
        this.guilds = new Map();
        this.controller = controller;
        this.primary = primary || false;
        this.settings = settings;
        this.client = new Discord.Client({
            disableMentions: "everyone",
            allowedMentions: {
                parse: [],
            },
            messageCacheMaxSize: 0,
        });
        this.client.login(settings.TOKEN);
        this.client.on("ready", async () => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const channel = this.client.channels.cache.get("792460755504070666");
            const embed = new Discord.MessageEmbed();
            embed.setAuthor((_a = this.client.user) === null || _a === void 0 ? void 0 : _a.username, ((_b = this.client.user) === null || _b === void 0 ? void 0 : _b.avatarURL()) || undefined);
            embed.setTitle(`${this.controller.name} Activated`);
            embed.setColor("#00ff00");
            embed.setTimestamp(Date.now());
            if (channel instanceof Discord.TextChannel)
                channel.send(embed);
            if (this.primary) {
                const commands = [
                    {
                        name: this.controller.command,
                        description: `Toggle ${this.controller.name}`,
                    },
                    {
                        name: `${this.controller.command}config`,
                        description: `Change your ${this.controller.name} settings`,
                        options: [
                            {
                                name: "name",
                                description: `Set your name for ${this.controller.name}`,
                                type: 1,
                                required: false,
                                options: [
                                    {
                                        name: "name",
                                        description: "Your Name",
                                        type: 3,
                                        required: true,
                                    },
                                ],
                            },
                        ],
                    },
                ];
                const devGuildCommands = await this.client.api
                    .applications((_c = this.client.user) === null || _c === void 0 ? void 0 : _c.id)
                    .guilds(this.controller.devguild)
                    .commands.get();
                for (const command of devGuildCommands) {
                    if (!commands.some(i => i.name + "dev" === command.name)) {
                        this.client.api
                            .applications((_d = this.client.user) === null || _d === void 0 ? void 0 : _d.id)
                            .guilds(this.controller.devguild)
                            .commands(command.id)
                            .delete();
                    }
                }
                const globalCommands = await this.client.api
                    .applications((_e = this.client.user) === null || _e === void 0 ? void 0 : _e.id)
                    .commands.get();
                for (const command of globalCommands) {
                    if (!commands.some(i => i.name === command.name)) {
                        this.client.api.applications((_f = this.client.user) === null || _f === void 0 ? void 0 : _f.id).commands(command.id).delete();
                    }
                }
                for (const command of commands) {
                    // Dev Guild Setup
                    this.client.api
                        .applications((_g = this.client.user) === null || _g === void 0 ? void 0 : _g.id)
                        .guilds(this.controller.devguild)
                        .commands.post({
                        data: Object.assign(Object.assign({}, command), { name: command.name + "dev" }),
                    });
                    // Global Setup
                    this.client.api.applications((_h = this.client.user) === null || _h === void 0 ? void 0 : _h.id).commands.post({
                        data: command,
                    });
                }
                this.client.ws.on("INTERACTION_CREATE", async (interaction) => {
                    var _a, _b, _c, _d;
                    if (interaction.data.name === this.controller.command ||
                        interaction.data.name === this.controller.command + "dev") {
                        const autoID = `${interaction.channel_id}_${interaction.member.user.id}`;
                        if (this.controller.auto.has(autoID)) {
                            this.controller.auto.delete(autoID);
                            this.client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 4,
                                    data: {
                                        content: `${this.controller.name} Disabled in <#${interaction.channel_id}> for ${((_a = interaction.member) === null || _a === void 0 ? void 0 : _a.nick) || interaction.member.user.username}`,
                                        allowed_mentions: [],
                                    },
                                },
                            });
                        }
                        else {
                            this.controller.auto.add(autoID);
                            this.client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 4,
                                    data: {
                                        content: `${this.controller.name} Enabled in <#${interaction.channel_id}> for ${((_b = interaction.member) === null || _b === void 0 ? void 0 : _b.nick) || interaction.member.user.username}`,
                                        allowed_mentions: [],
                                    },
                                },
                            });
                            return;
                        }
                    }
                    else if (interaction.data.name === this.controller.command + "config" ||
                        interaction.data.name === this.controller.command + "configdev") {
                        if (((_d = (_c = interaction.data.options) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.name) === "name") {
                            const name = interaction.data.options[0].options[0].value;
                            const user = await this.controller.db.get("SELECT ID from users WHERE ID = ?", interaction.member.user.id);
                            if (user) {
                                await this.controller.db.run("UPDATE users SET NAME = ? WHERE ID = ?", name, interaction.member.user.id);
                            }
                            else {
                                await this.controller.db.run("INSERT INTO users (ID, NAME) VALUES (?, ?)", interaction.member.user.id, name);
                            }
                            this.client.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 4,
                                    data: {
                                        content: `Set ${interaction.member.user.username}'s Name to ${name}`,
                                        allowed_mentions: [],
                                    },
                                },
                            });
                            return;
                        }
                    }
                });
            }
        });
        this.client.on("message", message => controller.handleMessage(message, this));
    }
    async disconnect() {
        var _a, _b;
        const channel = this.client.channels.cache.get("792460755504070666");
        const embed = new Discord.MessageEmbed();
        embed.setAuthor((_a = this.client.user) === null || _a === void 0 ? void 0 : _a.username, ((_b = this.client.user) === null || _b === void 0 ? void 0 : _b.avatarURL()) || undefined);
        embed.setTitle(`${this.controller.name} Deactivated`);
        embed.setColor("#ff0000");
        embed.setTimestamp(Date.now());
        if (channel instanceof Discord.TextChannel)
            await channel.send(embed);
        this.client.destroy();
        return;
    }
    async playSSML(ssml, channel, user, settings) {
        var _a, _b, _c, _d;
        let voice = this.settings.VOICE;
        if ((settings === null || settings === void 0 ? void 0 : settings.PRONOUN) === "f")
            voice = this.settings.VOICE_F || voice;
        if ((settings === null || settings === void 0 ? void 0 : settings.PRONOUN) === "m")
            voice = this.settings.VOICE_M || voice;
        if (((settings === null || settings === void 0 ? void 0 : settings.VOICE) || "en-GB-Standard-D") !== "en-GB-Standard-D")
            voice = (settings === null || settings === void 0 ? void 0 : settings.VOICE) || voice;
        const [response] = await ttsClient.synthesizeSpeech({
            input: {
                ssml,
            },
            voice: {
                languageCode: ((_a = settings === null || settings === void 0 ? void 0 : settings.VOICE) === null || _a === void 0 ? void 0 : _a.slice(0, 5)) || "en-GB",
                name: voice,
            },
            audioConfig: {
                audioEncoding: "MP3",
                pitch: Number(settings === null || settings === void 0 ? void 0 : settings.PITCH) || this.settings.PITCH || 0,
                speakingRate: Number(settings === null || settings === void 0 ? void 0 : settings.RATE) || 1,
            },
        });
        const connection = await channel.join();
        if (response.audioContent) {
            const dispatcher = connection.play(to_readable_stream_1.default(response.audioContent));
            let guildSettings = this.guilds.get(channel.guild.id);
            if (!guildSettings) {
                guildSettings = {};
            }
            guildSettings.last_user = user.id;
            guildSettings.last_time = Date.now();
            guildSettings.speaking = Date.now();
            // Auto-Disconnect after 5 Minutes
            if (channel.guild.id !== this.controller.devguild)
                (_b = channel.guild.me) === null || _b === void 0 ? void 0 : _b.setNickname(`${(_c = channel.guild.me.displayName) === null || _c === void 0 ? void 0 : _c.split(" | ")[0]} | ${(settings === null || settings === void 0 ? void 0 : settings.NAME) || ((_d = channel.guild.members.resolve(user.id)) === null || _d === void 0 ? void 0 : _d.displayName) || user.username}`.slice(0, 32));
            if (guildSettings.timeout)
                clearTimeout(guildSettings.timeout);
            guildSettings.timeout = setTimeout(() => {
                var _a, _b;
                channel.leave();
                if (channel.guild.id !== this.controller.devguild)
                    (_a = channel.guild.me) === null || _a === void 0 ? void 0 : _a.setNickname((_b = channel.guild.me.displayName) === null || _b === void 0 ? void 0 : _b.split(" | ")[0].slice(0, 32));
            }, 300000);
            let thisTimeout = guildSettings.timeout;
            dispatcher.on("finish", () => {
                var _a, _b;
                if (channel.guild.id !== this.controller.devguild &&
                    thisTimeout === (guildSettings === null || guildSettings === void 0 ? void 0 : guildSettings.timeout)) {
                    (_a = channel.guild.me) === null || _a === void 0 ? void 0 : _a.setNickname((_b = channel.guild.me.displayName) === null || _b === void 0 ? void 0 : _b.split(" | ")[0].slice(0, 32));
                    guildSettings.speaking = undefined;
                }
            });
            this.guilds.set(channel.guild.id, guildSettings);
        }
        return;
    }
    async playYouTube(link, channel) {
        var _a, _b, _c, _d;
        const video = await ytdl_core_1.default.getBasicInfo(link);
        const stream = ytdl_core_1.default(link);
        const connection = await channel.join();
        connection.play(stream, { volume: 0.5 });
        let guildSettings = this.guilds.get(channel.guild.id);
        if (!guildSettings) {
            guildSettings = {};
        }
        guildSettings.last_user = "music";
        guildSettings.last_time = Date.now();
        guildSettings.speaking = Date.now();
        // Auto-Disconnect after 5 Minutes
        if (channel.guild.id !== this.controller.devguild)
            (_a = channel.guild.me) === null || _a === void 0 ? void 0 : _a.setNickname(`${(_b = channel.guild.me.displayName) === null || _b === void 0 ? void 0 : _b.split(" | ")[0]} | ${(_c = video.videoDetails) === null || _c === void 0 ? void 0 : _c.title}`.slice(0, 32));
        if (guildSettings.timeout)
            clearTimeout(guildSettings.timeout);
        guildSettings.timeout = setTimeout(() => {
            var _a, _b;
            channel.leave();
            if (channel.guild.id !== this.controller.devguild)
                (_a = channel.guild.me) === null || _a === void 0 ? void 0 : _a.setNickname((_b = channel.guild.me.displayName) === null || _b === void 0 ? void 0 : _b.split(" | ")[0].slice(0, 32));
        }, Number(((_d = video.videoDetails) === null || _d === void 0 ? void 0 : _d.lengthSeconds) || 0) * 1000 + 5000);
        this.guilds.set(channel.guild.id, guildSettings);
        return;
    }
}
exports.MegalodonClient = MegalodonClient;
//# sourceMappingURL=client.js.map