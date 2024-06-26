/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Discord from "discord.js";
import toReadableStream from "to-readable-stream";
import path from "path";
import {writeFileSync} from "fs";
import fetch from "node-fetch";

// Setup GC TTS
import textToSpeech from "@google-cloud/text-to-speech";

if (process.env.TTS_SERVICE_ACCOUNT) {
	writeFileSync(path.resolve("/megalodon-sa.json"), process.env.TTS_SERVICE_ACCOUNT);
}
const ttsClient = new textToSpeech.TextToSpeechClient({
	keyFile: process.env.MEGDEV
		? path.resolve(__dirname, "../serviceaccount.json")
		: path.resolve("/megalodon-sa.json"),
});

// Setup ElevenLabs TTS
// @ts-expect-error
import elevenlabs from "elevenlabs-node";

import {TTSClientController} from "./controller";
import {TTSClientSettings, TTSGuildOptions, User, VoiceProvider} from "./types";
import {
	AudioPlayer,
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
	getVoiceConnection,
	joinVoiceChannel,// NoSubscriberBehavior,
} from "@discordjs/voice";
import {ApplicationCommandDataResolvable} from "discord.js";
import {p} from "./prisma";
import {Readable} from "stream";

export class TTSClient {
	guilds: Map<string, TTSGuildOptions> = new Map();
	client: Discord.Client;
	controller: TTSClientController;
	primary: boolean;
	settings: TTSClientSettings;

	private log(...args: unknown[]) {
		console.log(`[🤖 ${this.client.user?.username}]`, ...args);
	}

	constructor(
		controller: TTSClientController,
		settings: TTSClientSettings,
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
			intents: [
				Discord.IntentsBitField.Flags.GuildMessages,
				Discord.IntentsBitField.Flags.GuildVoiceStates,
				Discord.IntentsBitField.Flags.Guilds,
				Discord.IntentsBitField.Flags.GuildEmojisAndStickers,
				Discord.IntentsBitField.Flags.MessageContent,
			],
		});

		this.client.login(settings.token);

		this.client.on("ready", async () => {
			this.log("Ready!");
			const channel = this.client.channels.cache.get("792460755504070666");
			const embed = new Discord.EmbedBuilder();
			embed.setAuthor({
				name: this.client.user?.username ?? "N/A",
				iconURL: this.client.user?.avatarURL() || undefined
			});
			embed.setTitle(`${this.controller.name} Activated`);
			embed.setColor("#00ff00");
			embed.setTimestamp(Date.now());
			if (channel instanceof Discord.TextChannel) channel.send({embeds: [embed]});
			if (this.primary) {
				const commands: ApplicationCommandDataResolvable[] = [
					{
						name: this.controller.command,
						description: `Toggle ${this.controller.name}`,
						type: Discord.ApplicationCommandType.ChatInput,
					},
					{
						name: `Read Message`,
						type: Discord.ApplicationCommandType.Message,
					},
					{
						name: `${this.controller.command}config`,
						description: `Change your ${this.controller.name} settings`,
						type: Discord.ApplicationCommandType.ChatInput,
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
								allowedMentions: {parse: []},
							});
						} else {
							this.controller.auto.add(autoID);
							interaction.reply({
								content: `${this.controller.name} Enabled in <#${interaction.channelId}> for ${interaction.member?.user.username}`,
								allowedMentions: {parse: []},
							});
							return;
						}
					} else if (
						interaction.isCommand() &&
						(interaction.commandName === this.controller.command + "config" ||
							interaction.commandName === this.controller.command + "configdev")
					) {
						const nameOption = interaction.options.get("name");
						if (nameOption) {
							const name = nameOption.value;
							const user = await p.users.findUnique({where: {id: interaction.member?.user.id}});
							if (user) {
								await p.users.update({
									where: {id: interaction.member?.user.id},
									data: {name: name as string}
								})
							} else {
								await p.users.create({
									// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
									data: {id: interaction.member!.user.id, name: name as string}
								})
							}
							interaction.reply({
								content: `Set ${interaction.member?.user.username}'s Name to ${name}`,
								allowedMentions: {parse: []},
							});
							return;
						}
					} else if (
						interaction.isMessageContextMenuCommand() &&
						(interaction.commandName === "Read Message")
					) {
						controller.handleRead(interaction);
					}
				});
			}
		});

		this.client.on("messageCreate", message => controller.handleMessage(message, this));
	}

	async disconnect(): Promise<void> {
		const channel = this.client.channels.cache.get("792460755504070666");
		const embed = new Discord.EmbedBuilder();
		embed.setAuthor({
			name: this.client.user?.username as `${bigint}`,
			iconURL: this.client.user?.avatarURL() || undefined
		});
		embed.setTitle(`${this.controller.name} Deactivated`);
		embed.setColor("#ff0000");
		embed.setTimestamp(Date.now());
		if (channel instanceof Discord.TextChannel) await channel.send({embeds: [embed]});
		this.client.destroy();
		return;
	}

	async getVoiceProvider(settings: User | undefined, message: string): Promise<VoiceProvider> {
		if (message.startsWith("sfx:")) {
			return {
				rawText: true,
				getAudioStream: async text => {
					const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"xi-api-key": process.env.ELEVENLABS_API_KEY!,
						},
						body: JSON.stringify({
							text: text.slice("sfx:".length)
							// duration_seconds: 1,
							// prompt_influence: 0.3,
						})
					});
					return Readable.from(response.body!);
				},
				ssmlPlatform: null,
			}
		}
		if (settings?.voice?.startsWith("elevenlabs|")) {
			const voiceId = settings.voice.split("|")[1];
			return {
				getAudioStream: async text => {
					return await elevenlabs.textToSpeechStream(process.env.ELEVENLABS_API_KEY, voiceId, text)
				},
				ssmlPlatform: null,
			};
		}
		return {
			ssmlPlatform: "google-assistant",
			getAudioStream: async ssml => {
				let voice = this.settings.voice;
				if (settings?.pronoun === "f") voice = this.settings.voice_f || voice;
				if (settings?.pronoun === "m") voice = this.settings.voice_m || voice;
				if ((settings?.voice || "en-GB-Standard-D") !== "en-GB-Standard-D")
					voice = settings?.voice || voice;
				this.log("Synthesizing Google Speech", ssml);
				const [response] = await ttsClient.synthesizeSpeech({
					input: {
						ssml,
					},
					voice: {
						languageCode: voice.slice(0, 5),
						name: voice,
					},
					audioConfig: {
						audioEncoding: "MP3",
						pitch: Number(settings?.pitch) || this.settings.pitch || 0,
						speakingRate: Number(settings?.rate) || 1,
					},
				});
				if (response.audioContent) {
					return toReadableStream(response.audioContent);
				}
				return null;
			}
		}
	}

    async playSSML(
        ssml: string,
        channel: Discord.VoiceChannel | Discord.StageChannel,
        user: Discord.User,
		provider: VoiceProvider,
        settings?: User,
    ): Promise<void> {
        this.log("Synthesizing Speech", ssml);
		const readableStream = await provider.getAudioStream(ssml);

        this.log("Getting Voice Connection");
		const connection = getVoiceConnection(channel.guild.id, channel.guild.members.me?.id) ?? await joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator as any,
			group: channel.guild.members.me?.id,
			selfDeaf: true,
			selfMute: false,
		});
        if (connection.joinConfig.channelId !== channel.id) {
            connection.rejoin({
                channelId: channel.id,
                selfDeaf: true,
                selfMute: false,
            });
        }
        if (channel instanceof Discord.StageChannel) {
            await channel.guild.members.me?.voice.setSuppressed(false);
        }
        if (readableStream) {
            this.log("Playing Audio");
            let audioPlayer: AudioPlayer;
            try {
                audioPlayer = createAudioPlayer({
                    // behaviors: {
                    //     noSubscriber: NoSubscriberBehavior.Stop,
                    // },
                });
                connection.subscribe(audioPlayer);
                audioPlayer.play(createAudioResource(readableStream));
            } catch (err) {
                this.log("Error Playing Audio", err);
                throw err;
            }
            this.log("Audio Played");

			let guildSettings = this.guilds.get(channel.guild.id);
			if (!guildSettings) {
				guildSettings = {};
			}

			guildSettings.last_user = user.id;
			guildSettings.last_time = Date.now();
			guildSettings.speaking = Date.now();

			// Auto-Disconnect after 5 Minutes
			if (channel.guild.id !== this.controller.devguild)
				channel.guild.members.me?.setNickname(
					`${channel.guild.members.me.displayName?.split(" | ")[0]} | ${
						settings?.name || channel.guild.members.resolve(user.id)?.displayName || user.username
					}`.slice(0, 32)
				);

			this.log("Setting Timeout");

			if (guildSettings.timeout) clearTimeout(guildSettings.timeout);
			guildSettings.timeout = setTimeout(() => {
				connection.disconnect();
				if (channel.guild.id !== this.controller.devguild)
					channel.guild.members.me?.setNickname(channel.guild.members.me.displayName?.split(" | ")[0].slice(0, 32));
			}, 300000);

			const thisTimeout = guildSettings.timeout;
			audioPlayer.on(AudioPlayerStatus.Idle, () => {
				if (
					channel.guild.id !== this.controller.devguild &&
					thisTimeout === guildSettings?.timeout
				) {
					channel.guild.members.me?.setNickname(channel.guild.members.me.displayName?.split(" | ")[0].slice(0, 32));
					guildSettings.speaking = undefined;
				}
			});

			audioPlayer.on("error", err => {
				this.log("Audio Player Error", err);
				audioPlayer.stop();
			});

			this.guilds.set(channel.guild.id, guildSettings);

			this.log("Done");
		}
		return;
	}
}
