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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const path_1 = __importDefault(require("path"));
// Setup GC TTS
const text_to_speech_1 = __importDefault(require("@google-cloud/text-to-speech"));
const ttsClient = new text_to_speech_1.default.TextToSpeechClient({
    keyFile: process.env.MEGDEV
        ? path_1.default.resolve(__dirname, "../serviceaccount.json")
        : path_1.default.resolve("/megalodon-sa.json"),
});
const voice_1 = require("@discordjs/voice");
class MegalodonClient {
    constructor(controller, settings, primary) {
        this.guilds = new Map();
        this.controller = controller;
        this.primary = primary || false;
        this.settings = settings;
        this.client = new Discord.Client({
            allowedMentions: {
                parse: [],
                users: [],
                roles: [],
                repliedUser: false,
            },
            messageCacheLifetime: 1,
            intents: [
                Discord.Intents.FLAGS.GUILD_MESSAGES,
                Discord.Intents.FLAGS.GUILD_VOICE_STATES,
                Discord.Intents.FLAGS.GUILDS,
                Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
            ],
        });
        this.client.login(settings.TOKEN);
        this.client.on("ready", async () => {
            var _a, _b, _c, _d, _e;
            const channel = this.client.channels.cache.get("792460755504070666");
            const embed = new Discord.MessageEmbed();
            embed.setAuthor((_b = (_a = this.client.user) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : "N/A", ((_c = this.client.user) === null || _c === void 0 ? void 0 : _c.avatarURL()) || undefined);
            embed.setTitle(`${this.controller.name} Activated`);
            embed.setColor("#00ff00");
            embed.setTimestamp(Date.now());
            if (channel instanceof Discord.TextChannel)
                channel.send({ embeds: [embed] });
            if (this.primary) {
                const commands = [
                    {
                        name: this.controller.command,
                        description: `Toggle ${this.controller.name}`,
                        type: "CHAT_INPUT",
                    },
                    {
                        name: `Read Message`,
                        type: "MESSAGE",
                    },
                    {
                        name: `${this.controller.command}config`,
                        description: `Change your ${this.controller.name} settings`,
                        type: "CHAT_INPUT",
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
                (_d = this.client.guilds.resolve(this.controller.devguild)) === null || _d === void 0 ? void 0 : _d.commands.set(commands);
                (_e = this.client.application) === null || _e === void 0 ? void 0 : _e.commands.set(commands);
                this.client.on("interactionCreate", async (interaction) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                    if (interaction.isCommand() &&
                        (interaction.commandName === this.controller.command ||
                            interaction.commandName === this.controller.command + "dev")) {
                        const autoID = `${interaction.channelId}_${(_a = interaction.member) === null || _a === void 0 ? void 0 : _a.user.id}`;
                        if (this.controller.auto.has(autoID)) {
                            this.controller.auto.delete(autoID);
                            interaction.reply({
                                content: `${this.controller.name} Disabled in <#${interaction.channelId}> for ${(_b = interaction.member) === null || _b === void 0 ? void 0 : _b.user.username}`,
                                allowedMentions: { parse: [] },
                            });
                        }
                        else {
                            this.controller.auto.add(autoID);
                            interaction.reply({
                                content: `${this.controller.name} Enabled in <#${interaction.channelId}> for ${(_c = interaction.member) === null || _c === void 0 ? void 0 : _c.user.username}`,
                                allowedMentions: { parse: [] },
                            });
                            return;
                        }
                    }
                    else if (interaction.isCommand() &&
                        (interaction.commandName === this.controller.command ||
                            interaction.commandName === this.controller.command + "dev")) {
                        const autoID = `${interaction.channelId}_${(_d = interaction.member) === null || _d === void 0 ? void 0 : _d.user.id}`;
                        if (this.controller.auto.has(autoID)) {
                            this.controller.auto.delete(autoID);
                            interaction.reply({
                                content: `${this.controller.name} Disabled in <#${interaction.channelId}> for ${(_e = interaction.member) === null || _e === void 0 ? void 0 : _e.user.username}`,
                                allowedMentions: { parse: [] },
                            });
                        }
                        else {
                            this.controller.auto.add(autoID);
                            interaction.reply({
                                content: `${this.controller.name} Enabled in <#${interaction.channelId}> for ${(_f = interaction.member) === null || _f === void 0 ? void 0 : _f.user.username}`,
                                allowedMentions: { parse: [] },
                            });
                            return;
                        }
                    }
                    else if (interaction.isCommand() &&
                        (interaction.commandName === this.controller.command + "config" ||
                            interaction.commandName === this.controller.command + "configdev")) {
                        let nameOption = interaction.options.get("name");
                        if (nameOption) {
                            const name = nameOption.value;
                            const user = await this.controller.db.get("SELECT ID from users WHERE ID = ?", (_g = interaction.member) === null || _g === void 0 ? void 0 : _g.user.id);
                            if (user) {
                                await this.controller.db.run("UPDATE users SET NAME = ? WHERE ID = ?", name, (_h = interaction.member) === null || _h === void 0 ? void 0 : _h.user.id);
                            }
                            else {
                                await this.controller.db.run("INSERT INTO users (ID, NAME) VALUES (?, ?)", (_j = interaction.member) === null || _j === void 0 ? void 0 : _j.user.id, name);
                            }
                            interaction.reply({
                                content: `Set ${(_k = interaction.member) === null || _k === void 0 ? void 0 : _k.user.username}'s Name to ${name}`,
                                allowedMentions: { parse: [] },
                            });
                            return;
                        }
                    }
                    else if (interaction.isContextMenu() &&
                        (interaction.commandName === "Read Message")) {
                        controller.handleRead(interaction, this);
                    }
                });
            }
        });
        this.client.on("messageCreate", message => controller.handleMessage(message, this));
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
            await channel.send({ embeds: [embed] });
        this.client.destroy();
        return;
    }
    async playSSML(ssml, channel, user, settings) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
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
        const connection = (_c = voice_1.getVoiceConnection(channel.guild.id, (_b = channel.guild.me) === null || _b === void 0 ? void 0 : _b.id)) !== null && _c !== void 0 ? _c : await voice_1.joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            group: (_d = channel.guild.me) === null || _d === void 0 ? void 0 : _d.id,
        });
        if (connection.joinConfig.channelId !== channel.id) {
            connection.rejoin({
                channelId: channel.id,
                selfDeaf: true,
                selfMute: false,
            });
        }
        if (channel instanceof Discord.StageChannel) {
            await ((_e = channel.guild.me) === null || _e === void 0 ? void 0 : _e.voice.setSuppressed(false));
        }
        if (response.audioContent) {
            const audioPlayer = voice_1.createAudioPlayer();
            connection.subscribe(audioPlayer);
            audioPlayer.play(voice_1.createAudioResource(to_readable_stream_1.default(response.audioContent)));
            let guildSettings = this.guilds.get(channel.guild.id);
            if (!guildSettings) {
                guildSettings = {};
            }
            guildSettings.last_user = user.id;
            guildSettings.last_time = Date.now();
            guildSettings.speaking = Date.now();
            // Auto-Disconnect after 5 Minutes
            if (channel.guild.id !== this.controller.devguild)
                (_f = channel.guild.me) === null || _f === void 0 ? void 0 : _f.setNickname(`${(_g = channel.guild.me.displayName) === null || _g === void 0 ? void 0 : _g.split(" | ")[0]} | ${(settings === null || settings === void 0 ? void 0 : settings.NAME) || ((_h = channel.guild.members.resolve(user.id)) === null || _h === void 0 ? void 0 : _h.displayName) || user.username}`.slice(0, 32));
            if (guildSettings.timeout)
                clearTimeout(guildSettings.timeout);
            guildSettings.timeout = setTimeout(() => {
                var _a, _b;
                connection.disconnect();
                if (channel.guild.id !== this.controller.devguild)
                    (_a = channel.guild.me) === null || _a === void 0 ? void 0 : _a.setNickname((_b = channel.guild.me.displayName) === null || _b === void 0 ? void 0 : _b.split(" | ")[0].slice(0, 32));
            }, 300000);
            let thisTimeout = guildSettings.timeout;
            audioPlayer.on(voice_1.AudioPlayerStatus.Idle, () => {
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
}
exports.MegalodonClient = MegalodonClient;
//# sourceMappingURL=client.js.map