import {TTSClientController} from "./controller";
import {p} from "./prisma";
import "ffmpeg-static";

function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
        console.error(`🛑 Missing environment variable: ${key}`);
        process.exit();
    }
    return value;
}

(async function () {
    const bots = await p.bots.findMany();
    if (bots.length === 0) {
        console.error("🛑 Missing data in `bots` table");
        process.exit();
    }
    const controller = new TTSClientController(
        bots.map((i, n) => ({...i, primary: n === 0})),
        getRequiredEnv("TTS_COMMAND"),
        getRequiredEnv("TTS_NAME"),
        getRequiredEnv("TTS_DEVGUILD")
    );
    process.on("SIGINT", async () => {
        await controller.disconnect();
        process.exit();
    });
})();
