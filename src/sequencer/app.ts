import { Mina, PublicKey } from "o1js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";
import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { GameContracts, GameData } from "./utils.js";
import { checkEnv } from "../settlement/utils.js";

let gameContracts: GameContracts[] = [];

const minaEndpoint = checkEnv(process.env.MINA_ENDPOINT, "MISSING MINA_ENDPOINT");
const archiveEndpoint = checkEnv(process.env.ARCHIVE_ENDPOINT, "MISSING ARCHIVE_ENDPOINT");

function initializeMinaInstance() {
    const Network = Mina.Network({
        mina: minaEndpoint,
        archive: archiveEndpoint,
    });
    Mina.setActiveInstance(Network);
}

async function compileContracts() {
    try {
        console.time("GameToken.compile");
        await GameToken.compile();
        console.timeEnd("GameToken.compile");
    } catch (err) {
        console.error(err);
    }
}

async function initializeContracts(gameDataArray: GameData[]) {
    try {
        for (const gameData of gameDataArray) {
            const gameToken = new GameToken(PublicKey.fromBase58(gameData.gameTokenAddress));
            const drm = new DRM(PublicKey.fromBase58(gameData.drmAddress));

            gameContracts.push({
                gameTokenAddress: gameData.gameTokenAddress,
                gameToken,
                drmAddress: gameData.drmAddress,
                drm,
            });
        }
    } catch (err) {
        console.error(err);
    }
}
