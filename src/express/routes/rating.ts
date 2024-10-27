import express, { Router } from "express";
import { Game } from "../db/schemas.js";
import logger from "../logger.js";

const router: Router = express.Router();

router.get("/:gameId", async (req, res) => {
    const { gameId } = req.params;

    if (gameId === undefined) {
        logger.error("Game ID not provided");
        return res.status(400).send({ message: "Game ID not provided" });
    }

    try {
        const game = await Game.findOne({ gameId });

        if (!game) {
            logger.error("Game not found");
            return res.status(404).send({ message: "Game not found" });
        }

        const { averageRating, ratingCount } = game;
        res.status(200).json({ averageRating, ratingCount });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: "Error fetching rating" });
    }
});

export default router;
