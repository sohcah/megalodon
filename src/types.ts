export type MegalodonClientSettings = {
  PRIMARY: boolean;
  NAME: string;
  TOKEN: string;
  VOICE: string;
  VOICE_F?: string;
  VOICE_M?: string;
  PITCH?: number;
};


export type MegalodonGuildOptions = {
  timeout?: NodeJS.Timeout;
  last_time?: number;
  last_user?: string;
  speaking?: number;
};

export type User = {
  ID: string;
  NAME: string;
  PRONOUN?: string;
  VOICE?: string;
  PITCH?: number;
  RATE?: number;
  BLOCK?: boolean;
  CLIPBLOCK?: boolean;
  BYPASS?: boolean;
};
