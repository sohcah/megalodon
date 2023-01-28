import {bots, users} from "@prisma/client";

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
