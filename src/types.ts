import {bots, users} from "@prisma/client";
import {Readable} from 'stream';

export type TTSClientSettings = bots & {
    primary: boolean;
}


export type TTSGuildOptions = {
    timeout?: NodeJS.Timeout;
    last_time?: number;
    last_user?: string;
    speaking?: number;
};

export type User = users;

export type VoiceProvider = {
    getAudioStream: (text: string) => Promise<Readable | null>;
    ssmlPlatform:
        | "amazon-alexa"
        | "amazon-polly"
        | "amazon-polly-neural"
        | "google-assistant"
        | "microsoft-azure"
        | "samsung-bixby"
        | null;
}
