# Megalodon

Please remember to run `yarn build` before committing.

## Setup (Example)

1. `yarn run`
2. Run SQLite Queries to setup database
```sql

INSERT INTO bots (NAME, TOKEN, VOICE, VOICE_F, VOICE_M) VALUES (
    "Megalodon",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "en-US-Standard-D",
    "en-US-Standard-C",
    "en-US-Standard-D"
);

INSERT into config (NAME, COMMAND, DEVGUILD) VALUES (
    "Megalodon",
    "meg",
    "XXXXXXXXXXXXXXXXXX"
);
```