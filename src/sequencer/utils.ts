import { DRM, offchainState } from "drm-mina-contracts/build/src/DRM.js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";
import { Mina, PublicKey } from "o1js";
import { Game } from "./db/schemas.js";
import dotenv from "dotenv";
import logger from "./logger.js";
import { DeviceSession } from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { DeviceIdentifier } from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof.js";
import { BundledDeviceSession } from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof.js";
import Bundler from "./bundler.js";

dotenv.config();

export interface GameData {
    gameTokenAddress: string;
    drmAddress: string;
}

export interface GameContracts {
    gameTokenAddress: string;
    gameToken: GameToken;
    drmAddress: string;
    drm: DRM;
}

export interface Game {
    gameId: number;
    name: string;
    description: string;
    creator: string;
    imageFolder: string;
    imageCount: number;
    gameTokenContractAddress: string;
    DRMContractAddress: string;
    price: number;
    discount: number;
    tags: string[];
    downloadable: boolean;
}

export function checkEnv(input: string | undefined, message: string): string {
    if (input === undefined) {
        throw new Error(message);
    }
    return input;
}

const minaEndpoint = checkEnv(process.env.MINA_ENDPOINT, "MISSING MINA_ENDPOINT");
const archiveEndpoint = checkEnv(process.env.ARCHIVE_ENDPOINT, "MISSING ARCHIVE_ENDPOINT");

export function initializeMinaInstance() {
    const Network = Mina.Network({
        mina: minaEndpoint,
        archive: archiveEndpoint,
    });
    Mina.setActiveInstance(Network);
}

export async function compileContracts() {
    try {
        console.time("GameToken.compile");
        await GameToken.compile();
        console.timeEnd("GameToken.compile");

        console.time("DeviceIdentifier compile");
        await DeviceIdentifier.compile();
        console.timeEnd("DeviceIdentifier compile");

        console.time("DeviceSession compile");
        const { verificationKey } = await DeviceSession.compile();
        console.timeEnd("DeviceSession compile");

        if (!verificationKey) {
            throw new Error("Failed to compile DeviceSession");
        }

        console.time("BundledDeviceSession compile");
        await BundledDeviceSession.compile();
        console.timeEnd("BundledDeviceSession compile");

        console.time("baseProof");
        const baseProof = await BundledDeviceSession.base(
            PublicKey.fromBase58(process.env.GAME_TOKEN_ADDR3!)
        );
        console.timeEnd("baseProof");

        console.log(
            `Base proof: ${baseProof.publicOutput.deviceCount.toString()}, ${baseProof.publicInput.toBase58()}`
        );

        const bundler = Bundler.getInstance();
        console.log("Setting base proof");
        bundler.setBaseProof(baseProof);

        console.time("offchainState compile");
        await offchainState.compile();
        console.timeEnd("offchainState compile");

        console.time("DRM compile");
        await DRM.compile();
        console.timeEnd("DRM compile");

        return verificationKey;
    } catch (err) {
        console.error(err);
    }
}

export async function initializeContracts(gameData: GameData[], gameContracts: GameContracts[]) {
    try {
        for (let i = 0; i < gameData.length; i++) {
            const gameToken = new GameToken(PublicKey.fromBase58(gameData[i].gameTokenAddress));
            const drm = new DRM(PublicKey.fromBase58(gameData[i].drmAddress));
            drm.offchainState.setContractInstance(drm);

            gameContracts.push({
                gameTokenAddress: gameData[i].gameTokenAddress,
                gameToken,
                drmAddress: gameData[i].drmAddress,
                drm,
            });
        }

        // const bundler = Bundler.getInstance();
        // const drm = new DRM(PublicKey.fromBase58(process.env.DRM_ADDR3!));
        // bundler.setGameToken(PublicKey.fromBase58(process.env.GAME_TOKEN_ADDR3!), drm);
    } catch (err) {
        console.error(err);
    }
}

export async function fetchGamesFromDB() {
    const games: Game[] = await Game.find({});
    const gameContractAdresses: GameData[] = games.map((game) => ({
        gameTokenAddress: game.gameTokenContractAddress,
        drmAddress: game.DRMContractAddress,
    }));
    return gameContractAdresses;
}

export async function updateGamePrices(gameContracts: GameContracts[]) {
    const games: Game[] = await Game.find({});
    const gamePrices = await Promise.all(
        gameContracts.map(async ({ gameTokenAddress, gameToken }) => {
            try {
                const price = await gameToken.gamePrice.fetch();
                const discount = await gameToken.discount.fetch();
                logger.info(`Game ${gameTokenAddress} price: ${price}, discount: ${discount}`);
                return { gameTokenAddress, price, discount };
            } catch (err) {
                logger.error(
                    `Failed to fetch game price or discount for ${gameTokenAddress}:`,
                    err
                );
                return { gameTokenAddress, price: null, discount: null };
            }
        })
    );

    for (let i = 0; i < games.length; i++) {
        games[i].price = Number(gamePrices[i].price?.toString() || games[i].price) / 1000000000;
        games[i].discount =
            Number(gamePrices[i].discount?.toString() || games[i].discount) / 1000000000;

        await Game.updateOne({ gameId: games[i].gameId }, { $set: games[i] }, { upsert: true });
        logger.info(`Game ${games[i].gameId} price updated to ${games[i].price}`);
    }
}
