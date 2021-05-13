/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Discord from "discord.js";
import toReadableStream from "to-readable-stream";
import ytdl from "ytdl-core";
import path from "path";

// Setup GC TTS
import textToSpeech from "@google-cloud/text-to-speech";
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFile: process.env.MEGDEV
    ? path.resolve(__dirname, "../serviceaccount.json")
    : path.resolve("/megalodon-sa.json"),
});
import { MegalodonClientController } from "./controller";
import { MegalodonClientSettings, MegalodonGuildOptions, User } from "./types";

export class MegalodonClient {
  guilds: Map<string, MegalodonGuildOptions> = new Map();
  client: Discord.Client;
  controller: MegalodonClientController;
  primary: boolean;
  settings: MegalodonClientSettings;

  constructor(
    controller: MegalodonClientController,
    settings: MegalodonClientSettings,
    primary?: boolean
  ) {
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
      messageCacheMaxSize: 0,
      intents: ["GUILD_MESSAGES", "GUILD_VOICE_STATES", "GUILDS"],
    });

    this.client.login(settings.TOKEN);

    this.client.on("ready", async () => {
      const channel = this.client.channels.cache.get("792460755504070666");
      const embed = new Discord.MessageEmbed();
      embed.setAuthor(this.client.user?.username, this.client.user?.avatarURL() || undefined);
      embed.setTitle(`${this.controller.name} Activated`);
      embed.setColor("#00ff00");
      embed.setTimestamp(Date.now());
      if (channel instanceof Discord.TextChannel) channel.send(embed);
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

        this.client.guilds.resolve(this.controller.devguild)?.commands.set(commands);
        this.client.application?.commands.set(commands);

        this.client.on("interaction", async interaction => {
          if (
            interaction.isCommand() &&
            (interaction.commandName === this.controller.command ||
              interaction.commandName === this.controller.command + "dev")
          ) {
            const autoID = `${interaction.channelID}_${interaction.member.user.id}`;
            if (this.controller.auto.has(autoID)) {
              this.controller.auto.delete(autoID);
              interaction.reply(
                `${this.controller.name} Disabled in <#${interaction.channelID}> for ${
                  interaction.member?.nick || interaction.member.user.username
                }`,
                {
                  allowedMentions: { parse: [] },
                }
              );
            } else {
              this.controller.auto.add(autoID);
              interaction.reply(
                `${this.controller.name} Enabled in <#${interaction.channelID}> for ${
                  interaction.member?.nick || interaction.member.user.username
                }`,
                {
                  allowedMentions: { parse: [] },
                }
              );
              return;
            }
          } else if (
            interaction.isCommand() &&
            (interaction.commandName === this.controller.command + "config" ||
              interaction.commandName === this.controller.command + "configdev")
          ) {
            if (interaction.options?.[0]?.name === "name") {
              const name = interaction.options[0].options?.[0].value;
              const user = await this.controller.db.get(
                "SELECT ID from users WHERE ID = ?",
                interaction.member.user.id
              );
              if (user) {
                await this.controller.db.run(
                  "UPDATE users SET NAME = ? WHERE ID = ?",
                  name,
                  interaction.member.user.id
                );
              } else {
                await this.controller.db.run(
                  "INSERT INTO users (ID, NAME) VALUES (?, ?)",
                  interaction.member.user.id,
                  name
                );
              }
              interaction.reply(`Set ${interaction.member.user.username}'s Name to ${name}`, {
                allowedMentions: { parse: [] },
              });
              return;
            }
          }
        });
      }
    });

    this.client.on("message", message => controller.handleMessage(message, this));
  }

  async disconnect(): Promise<void> {
    const channel = this.client.channels.cache.get("792460755504070666");
    const embed = new Discord.MessageEmbed();
    embed.setAuthor(this.client.user?.username, this.client.user?.avatarURL() || undefined);
    embed.setTitle(`${this.controller.name} Deactivated`);
    embed.setColor("#ff0000");
    embed.setTimestamp(Date.now());
    if (channel instanceof Discord.TextChannel) await channel.send(embed);
    this.client.destroy();
    return;
  }

  async playSSML(
    ssml: string,
    channel: Discord.BaseGuildVoiceChannel,
    user: Discord.User,
    settings?: User
  ): Promise<void> {
    let voice = this.settings.VOICE;
    if (settings?.PRONOUN === "f") voice = this.settings.VOICE_F || voice;
    if (settings?.PRONOUN === "m") voice = this.settings.VOICE_M || voice;
    if ((settings?.VOICE || "en-GB-Standard-D") !== "en-GB-Standard-D")
      voice = settings?.VOICE || voice;
    const [response] = await ttsClient.synthesizeSpeech({
      input: {
        ssml,
      },
      voice: {
        languageCode: settings?.VOICE?.slice(0, 5) || "en-GB",
        name: voice,
      },
      audioConfig: {
        audioEncoding: "MP3",
        pitch: Number(settings?.PITCH) || this.settings.PITCH || 0,
        speakingRate: Number(settings?.RATE) || 1,
      },
    });

		const connection = await channel.join();
		if (channel instanceof Discord.StageChannel) {
			await connection.voice?.setSuppressed(false);
		}
    if (response.audioContent) {
      const dispatcher = connection.play(toReadableStream(response.audioContent));

      let guildSettings = this.guilds.get(channel.guild.id);
      if (!guildSettings) {
        guildSettings = {};
      }

      guildSettings.last_user = user.id;
      guildSettings.last_time = Date.now();
      guildSettings.speaking = Date.now();

      // Auto-Disconnect after 5 Minutes
      if (channel.guild.id !== this.controller.devguild)
        channel.guild.me?.setNickname(
          `${channel.guild.me.displayName?.split(" | ")[0]} | ${
            settings?.NAME || channel.guild.members.resolve(user.id)?.displayName || user.username
          }`.slice(0, 32)
        );
      if (guildSettings.timeout) clearTimeout(guildSettings.timeout);
      guildSettings.timeout = setTimeout(() => {
        channel.leave();
        if (channel.guild.id !== this.controller.devguild)
          channel.guild.me?.setNickname(channel.guild.me.displayName?.split(" | ")[0].slice(0, 32));
      }, 300000);

      let thisTimeout = guildSettings.timeout;
      dispatcher.on("finish", () => {
        if (
          channel.guild.id !== this.controller.devguild &&
          thisTimeout === guildSettings?.timeout
        ) {
          channel.guild.me?.setNickname(channel.guild.me.displayName?.split(" | ")[0].slice(0, 32));
          guildSettings.speaking = undefined;
        }
      });

      this.guilds.set(channel.guild.id, guildSettings);
    }
    return;
  }

  async playYouTube(link: string, channel: Discord.BaseGuildVoiceChannel): Promise<void> {
    const video = await ytdl.getBasicInfo(link);
    const stream = ytdl(link);

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
      channel.guild.me?.setNickname(
        `${channel.guild.me.displayName?.split(" | ")[0]} | ${video.videoDetails?.title}`.slice(
          0,
          32
        )
      );
    if (guildSettings.timeout) clearTimeout(guildSettings.timeout);
    guildSettings.timeout = setTimeout(() => {
      channel.leave();
      if (channel.guild.id !== this.controller.devguild)
        channel.guild.me?.setNickname(channel.guild.me.displayName?.split(" | ")[0].slice(0, 32));
    }, Number(video.videoDetails?.lengthSeconds || 0) * 1000 + 5000);

    this.guilds.set(channel.guild.id, guildSettings);
    return;
  }
}
