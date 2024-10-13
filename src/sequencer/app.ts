import express from "express";
import {
    compileContracts,
    fetchGamesFromDB,
    GameContracts,
    initializeContracts,
    initializeMinaInstance,
    updateGamePrices,
} from "./utils.js";
import { connectToDatabase } from "./db/connection.js";
import logger from "./logger.js";

let gameContracts: GameContracts[] = [];

const port = 3334;

const app = express();
app.use(express.json());

try {
    await connectToDatabase();
    initializeMinaInstance();
    await compileContracts();
    const gameData = await fetchGamesFromDB();
    await initializeContracts(gameData, gameContracts);
    await updateGamePrices(gameContracts);
    app.listen(port, () => {
        logger.info(`Server running on http://localhost:${port}`);
    });
} catch (err) {
    logger.error("Failed to connect to the database:", err);
    process.exit(1);
}
