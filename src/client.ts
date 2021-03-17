/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Discord from "discord.js";
import toReadableStream from "to-readable-stream"
import ytdl from "ytdl-core";
import path from "path";

// Setup GC TTS
import textToSpeech from "@google-cloud/text-to-speech";
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFile: path.resolve(__dirname, "../serviceaccount.json"),
});
import { MegalodonClientController } from "./controller";
import { ClientWithAPI, MegalodonClientSettings, MegalodonGuildOptions, User } from "./types";

export class MegalodonClient {
  guilds: Map<string, MegalodonGuildOptions> = new Map();
  client: ClientWithAPI;
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

    this.client = (new Discord.Client({
      disableMentions: "everyone",
      allowedMentions: {
        parse: [],
      },
      messageCacheMaxSize: 0,
    }) as unknown) as ClientWithAPI;

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

        const devGuildCommands = await this.client.api
          .applications(this.client.user?.id)
          .guilds(this.controller.devguild)
          .commands.get();
        for (const command of devGuildCommands) {
          if (!commands.some(i => i.name + "dev" === command.name)) {
            this.client.api
              .applications(this.client.user?.id)
              .guilds(this.controller.devguild)
              .commands(command.id)
              .delete();
          }
        }

        const globalCommands = await this.client.api
          .applications(this.client.user?.id)
          .commands.get();
        for (const command of globalCommands) {
          if (!commands.some(i => i.name === command.name)) {
            this.client.api.applications(this.client.user?.id).commands(command.id).delete();
          }
        }

        for (const command of commands) {
          // Dev Guild Setup
          this.client.api
            .applications(this.client.user?.id)
            .guilds(this.controller.devguild)
            .commands.post({
              data: { ...command, name: command.name + "dev" },
            });

          // Global Setup
          this.client.api.applications(this.client.user?.id).commands.post({
            data: command,
          });
        }
        this.client.ws.on("INTERACTION_CREATE" as Discord.WSEventType, async interaction => {
          if (
            interaction.data.name === this.controller.command ||
            interaction.data.name === this.controller.command + "dev"
          ) {
            const autoID = `${interaction.channel_id}_${interaction.member.user.id}`;
            if (this.controller.auto.has(autoID)) {
              this.controller.auto.delete(autoID);
              this.client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                  type: 4,
                  data: {
                    content: `${this.controller.name} Disabled in <#${
                      interaction.channel_id
                    }> for ${interaction.member?.nick || interaction.member.user.username}`,
                  },
                },
              });
            } else {
              this.controller.auto.add(autoID);
              this.client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                  type: 4,
                  data: {
                    content: `${this.controller.name} Enabled in <#${interaction.channel_id}> for ${
                      interaction.member?.nick || interaction.member.user.username
                    }`,
                  },
                },
              });
              return;
            }
          } else if (
            interaction.data.name === this.controller.command + "config" ||
            interaction.data.name === this.controller.command + "configdev"
          ) {
            if (interaction.data.options?.[0]?.name === "name") {
              const name = interaction.data.options[0].options[0].value;
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
              this.client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                  type: 4,
                  data: {
                    content: `Set ${interaction.member.user.username}'s Name to ${name}`,
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
    channel: Discord.VoiceChannel,
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
    if (response.audioContent) connection.play(toReadableStream(response.audioContent));

    let guildSettings = this.guilds.get(channel.guild.id);
    if (!guildSettings) {
      guildSettings = {};
    }

    guildSettings.last_user = user.id;
    guildSettings.last_time = Date.now();

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

    this.guilds.set(channel.guild.id, guildSettings);
    return;
  }

  async playYouTube(link: string, channel: Discord.VoiceChannel): Promise<void> {
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