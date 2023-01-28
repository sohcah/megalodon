/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Discord from "discord.js";
import urlParse from "url-parse";
import psl from "psl";
import {SpeechMarkdown} from "speechmarkdown-js";

import {TTSClient} from "./client";
import {TTSClientSettings, User} from "./types";
import {p} from "./prisma";

export class TTSClientController {
    clients: TTSClient[];
    auto: Set<string> = new Set();
    name: string;
    command: string;
    devguild: string;

    constructor(
        bots: TTSClientSettings[],
        command: string,
        name: string,
        devguild: string
    ) {
        this.name = name;
        this.command = command;
        this.devguild = devguild;
        this.clients = bots.map((settings, index) => new TTSClient(this, settings, index === 0));
    }

    async handleRead(interaction: Discord.ContextMenuCommandInteraction): Promise<void> {
        const msg = interaction.options.getMessage("message");
        if (!msg) {
            interaction.reply("Unable to read message.");
            return;
        }
        const message = msg as Discord.Message;
        const user = (await p.users.findUnique({where: {id: message.author.id}})) ?? undefined;
        const rereadUser = (await p.users.findUnique({where: {id: interaction.user.id}})) ?? undefined;
        const {channel, client} = this.getChannel(interaction.user);
        if (!channel || !client) {
            interaction.reply("Unable to read message.");
            return;
        }
        const ssml = this.getSSML(
            message,
            client,
            channel.guild,
            user,
            rereadUser,
            rereadUser?.name ?? interaction.user.username,
            interaction
        );
        if (!ssml) {
            if (!interaction.replied) {
                interaction.reply("Unable to read message.");
            }
            return;
        }
        const member = await channel.guild.members.fetch(message.author);
        if (!member) {
            interaction.reply("Unable to read message.");
            return;
        }
        if (member.voice.suppress || member.voice.serverMute) {
            interaction.reply("Unable to read message.");
            return;
        }
        await client.playSSML(ssml, channel, interaction.user, rereadUser);
        interaction.reply("Message read.");
    }

    async handleMessage(message: Discord.Message, client: TTSClient): Promise<void> {
        if (message.author.bot || message.content.startsWith(`</`)) return;
        if (!message.channel.isDMBased() && !client.primary) return;
        if (
            message.content.startsWith("~auto_toggle ") &&
            message.member?.permissions.has(Discord.PermissionsBitField.Flags.Administrator)
        ) {
            const autoID = message.content.split(" ")[1];
            if (this.auto.has(autoID)) {
                this.auto.delete(autoID);
                message.reply(`Auto-read disabled for ${autoID}.`);
            } else {
                this.auto.add(autoID);
                message.reply(`Auto-read enabled for ${autoID}.`);
            }
            return;
        }
        const autoID = `${message.channel.id}_${message.author.id}`;
        if ((message.channel.isDMBased() || this.auto.has(autoID)) && !message.content.match(/^"/)) {
            const user = (await p.users.findUnique({where: {id: message.author.id}})) ?? undefined;
            const {channel, client} = this.getChannel(message.author);
            if (!channel || !client) {
                message.react("🚫");
                return;
            }
            let ssml: string | undefined;
            try {
                ssml = this.getSSML(message, client, channel.guild, user);
            } catch {
                message.react("⚠️");
                message.reply("Unable to parse SpeechMarkdown (https://www.speechmarkdown.org)");
                return;
            }
            if (!ssml) {
                message.react("🚫");
                return;
            }
            const member = await channel.guild.members.fetch(message.author);
            if (!member) {
                message.react("⚠");
                return;
            }
            if (member.voice.suppress || member.voice.serverMute) {
                message.react("❌");
                return;
            }
            await client.playSSML(ssml, channel, message.author, user);
        }
    }

    getSSML(
        message: Discord.Message,
        client: TTSClient,
        guild: Discord.Guild,
        user?: User,
        rereadUser?: User,
        rereadName?: string,
        interaction?: Discord.ContextMenuCommandInteraction
    ): string | undefined {
        const speech = new SpeechMarkdown();
        let content = message.content
            .replace(
                /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/g,
                link => {
                    const url = urlParse(link);
                    const parsed = psl.parse(url.hostname);
                    if (parsed.error) {
                        return `${url.hostname} Link`;
                    } else {
                        return `${parsed.domain} Link`;
                    }
                }
            )
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
        if (!(rereadUser ?? user)?.clipBlock) {
            content = content
                .replace(/\bdil?ligaf\b/gi, '!["https://thegameroomlegacyfiles.sohcah.dev/dilligaf.mp3"]')
                .replace(/\bbruh\b/gi, '!["https://thegameroomlegacyfiles.sohcah.dev/bruh.mp3"]')
                .replace(/\bwill_AAA\b/gi, '!["https://thegameroomlegacyfiles.sohcah.dev/will_scream.wav"]')
                .replace(/\bwaa+\b/gi, '!["https://thegameroomlegacyfiles.sohcah.dev/waa.ogg"]')
                .replace(/\bwa+h+\b/gi, '!["https://thegameroomlegacyfiles.sohcah.dev/waa.ogg"]');
        }
        if (content.length > 400 && !(rereadUser ?? user)?.bypassLimit) {
            if (!interaction) {
                message.channel.send(
                    "This message is too long. Please limit your message to 400 characters."
                );
            } else {
                interaction.reply("This message is too long. Please limit your message to 400 characters.");
            }
            return;
        }
        if ((rereadUser ?? user)?.block) {
            if (!interaction) {
                message.channel.send("You are blocked from using Text-to-Speech.");
            } else {
                interaction.reply("You are blocked from using Text-to-Speech.");
            }
            return;
        }
        const name = user?.name ?? message.member?.displayName ?? message.author.username;
        if (content === "tenor.com Link") {
            content = `${name} sent a Tenor GIF`;
        } else if (content === "giphy.com Link") {
            content = `${name} sent a Giphy GIF`;
        } else if (content.match(/tenor.com Link/)) {
            content = `${name} sent a Tenor GIF and says ${content.replace(
                /(giphy|tenor).com Link/g,
                ""
            )}`;
        } else if (content.match(/giphy.com Link/)) {
            content = `${name} sent a Giphy GIF and says ${content.replace(
                /(giphy|tenor).com Link/g,
                ""
            )}`;
        } else if (message.attachments.find(i => (!!i.height)) && content.length > 0) {
            content = `${name} sent an image and says ${content}`;
        } else if (message.attachments.find(i => (!!i.height))) {
            content = `${name} sent an image`;
        } else if (message.attachments.size > 0 && content.length > 0) {
            content = `${name} sent a file and says ${content}`;
        } else if (message.attachments.size > 0) {
            content = `${name} sent a file`;
        } else if (message.stickers.size > 0 && content.length > 0) {
            content = `${name} sent a ${message.stickers.first()?.name} sticker and says ${content}`;
        } else if (message.stickers.size > 0) {
            content = `${name} sent a ${message.stickers.first()?.name} sticker`;
        } else if (
            !!rereadName ||
            client.guilds.get(guild.id)?.last_user !== message.author.id ||
            (client.guilds.get(guild.id)?.last_time || 0) < Date.now() - 180000
        ) {
            content = `${name} says ${content}`;
        }
        if (rereadName) {
            content = `${rereadName} read the following message: ${content}`;
        }
        try {
            return speech.toSSML(content, {
                platform: "google-assistant",
            });
        } catch {
            console.debug(`Failed to convert ${content} to SSML`);
            throw new Error("Failed to convert text to SSML.");
        }
    }

    getChannel(
        user: Discord.User,
        clientDefault?: TTSClient
    ): { channel?: Discord.VoiceChannel | Discord.StageChannel; client?: TTSClient } {
        const channel: Discord.VoiceChannel | Discord.StageChannel =
            this.clients[0].client.channels.cache.find(
                c =>
                    (c instanceof Discord.VoiceChannel || c instanceof Discord.StageChannel) &&
                    c.members.has(user.id)
            ) as Discord.VoiceChannel | Discord.StageChannel;
        if (!channel) return {};
        let client;
        if (clientDefault) {
            client = clientDefault;
        } else {
            client =
                client || this.clients.find(c => c.guilds.get(channel.guild.id)?.last_user === user.id);
            client =
                client ||
                this.clients.find(
                    c => (c.guilds.get(channel.guild.id)?.last_time || 0) < Date.now() - 300000
                );
            client =
                client ||
                this.clients.find(c => channel.members.has(c.client.user?.id || ("" as `${bigint}`)));
            client =
                client ||
                this.clients
                    .sort(
                        (a, b) =>
                            (a.guilds.get(channel.guild.id)?.last_time || 0) -
                            (b.guilds.get(channel.guild.id)?.last_time || 0)
                    )
                    .sort(
                        (a, b) =>
                            (a.guilds.get(channel.guild.id)?.speaking ? 1 : 0) -
                            (b.guilds.get(channel.guild.id)?.speaking ? 1 : 0)
                    )[0];
        }
        return {
            channel: client.client.channels.resolve(channel.id) as
                | Discord.VoiceChannel
                | Discord.StageChannel
                | undefined,
            client,
        };
    }

    async disconnect(): Promise<void> {
        await Promise.all(this.clients.map(i => i.disconnect()));
        return;
    }
}
