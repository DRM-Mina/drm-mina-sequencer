import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";
import { Mina, PublicKey, UInt64 } from "o1js";
import { Game } from "./db/schemas.js";
import dotenv from "dotenv";
import logger from "./logger.js";
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
    } catch (err) {
        console.error(err);
    }
}

export async function initializeContracts(gameData: GameData[], gameContracts: GameContracts[]) {
    try {
        for (let i = 0; i < gameData.length; i++) {
            const gameToken = new GameToken(PublicKey.fromBase58(gameData[i].gameTokenAddress));
            const drm = new DRM(PublicKey.fromBase58(gameData[i].drmAddress));

            gameContracts.push({
                gameTokenAddress: gameData[i].gameTokenAddress,
                gameToken,
                drmAddress: gameData[i].drmAddress,
                drm,
            });
        }
        console.log("Game contracts initialized");
        console.log(gameContracts);
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
    logger.info("Updating game prices");
    const games: Game[] = await Game.find({});
    logger.info(`Found ${games.length} games`);
    console.log("GameContracts", gameContracts);
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

    logger.info("Game prices fetched");

    for (let i = 0; i < games.length; i++) {
        games[i].price = Number(gamePrices[i].price?.toString() || games[i].price) / 1000000000;
        games[i].discount =
            Number(gamePrices[i].discount?.toString() || games[i].discount) / 1000000000;

        await Game.updateOne({ gameId: games[i].gameId }, { $set: games[i] }, { upsert: true });
        logger.info(`Game ${games[i].gameId} price updated to ${games[i].price}`);
    }
}
