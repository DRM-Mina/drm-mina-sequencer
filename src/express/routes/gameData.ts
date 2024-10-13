import express, { Router } from "express";
import { Game } from "../db/schemas.js";
import logger from "../logger.js";

const router: Router = express.Router();

router.get("/", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
        const games = await Game.find({});
        logger.info("Game Data Sended.");
        res.json(games);
    } catch (err) {
        logger.error(err);
        res.status(500).send({ message: "Error retrieving game data" });
    }
});

export default router;
