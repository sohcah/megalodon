/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Discord from "discord.js";
import toReadableStream from "to-readable-stream";
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
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";

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
      const channel = this.client.channels.cache.get("792460755504070666");
      const embed = new Discord.MessageEmbed();
      embed.setAuthor(
        this.client.user?.username ?? "N/A",
        this.client.user?.avatarURL() || undefined
      );
      embed.setTitle(`${this.controller.name} Activated`);
      embed.setColor("#00ff00");
      embed.setTimestamp(Date.now());
      if (channel instanceof Discord.TextChannel) channel.send({ embeds: [embed] });
      if (this.primary) {
        const commands = [
          {
            name: this.controller.command,
            description: `Toggle ${this.controller.name}`,
            type: "CHAT_INPUT" as const,
          },
          {
            name: `Read Message`,
            type: "MESSAGE" as const,
          },
          {
            name: `${this.controller.command}config`,
            description: `Change your ${this.controller.name} settings`,
            type: "CHAT_INPUT" as const,
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

        this.client.guilds.resolve(this.controller.devguild as `${bigint}`)?.commands.set(commands);
        this.client.application?.commands.set(commands);

        this.client.on("interactionCreate", async interaction => {
          if (
            interaction.isCommand() &&
            (interaction.commandName === this.controller.command ||
              interaction.commandName === this.controller.command + "dev")
          ) {
            const autoID = `${interaction.channelId}_${interaction.member?.user.id}`;
            if (this.controller.auto.has(autoID)) {
              this.controller.auto.delete(autoID);
              interaction.reply({
                content: `${this.controller.name} Disabled in <#${interaction.channelId}> for ${interaction.member?.user.username}`,
                allowedMentions: { parse: [] },
              });
            } else {
              this.controller.auto.add(autoID);
              interaction.reply({
                content: `${this.controller.name} Enabled in <#${interaction.channelId}> for ${interaction.member?.user.username}`,
                allowedMentions: { parse: [] },
              });
              return;
            }
          } else if (
            interaction.isCommand() &&
            (interaction.commandName === this.controller.command ||
              interaction.commandName === this.controller.command + "dev")
          ) {
            const autoID = `${interaction.channelId}_${interaction.member?.user.id}`;
            if (this.controller.auto.has(autoID)) {
              this.controller.auto.delete(autoID);
              interaction.reply({
                content: `${this.controller.name} Disabled in <#${interaction.channelId}> for ${interaction.member?.user.username}`,
                allowedMentions: { parse: [] },
              });
            } else {
              this.controller.auto.add(autoID);
              interaction.reply({
                content: `${this.controller.name} Enabled in <#${interaction.channelId}> for ${interaction.member?.user.username}`,
                allowedMentions: { parse: [] },
              });
              return;
            }
          } else if (
            interaction.isCommand() &&
            (interaction.commandName === this.controller.command + "config" ||
              interaction.commandName === this.controller.command + "configdev")
          ) {
            let nameOption = interaction.options.get("name");
            if (nameOption) {
              const name = nameOption.value;
              const user = await this.controller.db.get(
                "SELECT ID from users WHERE ID = ?",
                interaction.member?.user.id
              );
              if (user) {
                await this.controller.db.run(
                  "UPDATE users SET NAME = ? WHERE ID = ?",
                  name,
                  interaction.member?.user.id
                );
              } else {
                await this.controller.db.run(
                  "INSERT INTO users (ID, NAME) VALUES (?, ?)",
                  interaction.member?.user.id,
                  name
                );
              }
              interaction.reply({
                content: `Set ${interaction.member?.user.username}'s Name to ${name}`,
                allowedMentions: { parse: [] },
              });
              return;
            }
          } else if (
            interaction.isContextMenu() &&
            (interaction.commandName === "Read Message")
          ) {
            controller.handleRead(interaction, this);
          }
        });
      }
    });

    this.client.on("messageCreate", message => controller.handleMessage(message, this));
  }

  async disconnect(): Promise<void> {
    const channel = this.client.channels.cache.get("792460755504070666");
    const embed = new Discord.MessageEmbed();
    embed.setAuthor(
      this.client.user?.username as `${bigint}`,
      this.client.user?.avatarURL() || undefined
    );
    embed.setTitle(`${this.controller.name} Deactivated`);
    embed.setColor("#ff0000");
    embed.setTimestamp(Date.now());
    if (channel instanceof Discord.TextChannel) await channel.send({ embeds: [embed] });
    this.client.destroy();
    return;
  }

  async playSSML(
    ssml: string,
    channel: Discord.VoiceChannel | Discord.StageChannel,
    user: Discord.User,
    settings?: User,
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

    const connection = getVoiceConnection(channel.guild.id, channel.guild.me?.id) ?? await joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
      group: channel.guild.me?.id,
    });
    if (connection.joinConfig.channelId !== channel.id) {
      connection.rejoin({
        channelId: channel.id,
        selfDeaf: true,
        selfMute: false,
      });
    }
    if (channel instanceof Discord.StageChannel) {
      await channel.guild.me?.voice.setSuppressed(false);
    }
    if (response.audioContent) {
      const audioPlayer = createAudioPlayer();
      connection.subscribe(audioPlayer);
      audioPlayer.play(createAudioResource(toReadableStream(response.audioContent)));

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
        connection.disconnect();
        if (channel.guild.id !== this.controller.devguild)
          channel.guild.me?.setNickname(channel.guild.me.displayName?.split(" | ")[0].slice(0, 32));
      }, 300000);

      let thisTimeout = guildSettings.timeout;
      audioPlayer.on(AudioPlayerStatus.Idle, () => {
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
}
