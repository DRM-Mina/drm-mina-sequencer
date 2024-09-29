import express, { Router } from "express";
import { User } from "../db/schemas";
import { authenticateToken } from "../middlewares/authenticateToken";
import { MINA_ADDRESS_REGEX } from "../utils/constants";

import logger from "../logger";

const router: Router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
    const { publicKey, gameId } = req.body;

    if (!gameId) {
        res.status(400).send({ message: "Game ID not provided" });
        return;
    }

    if (!publicKey) {
        res.status(400).send({ message: "Public key not provided" });
        return;
    }

    if (!MINA_ADDRESS_REGEX.test(publicKey)) {
        res.status(400).send({ message: "Invalid public key" });
        return;
    }

    try {
        const user = await User.findOne({ publicKey });

        if (user) {
            if (user.wishlistedGames.includes(gameId)) {
                await User.updateOne({ publicKey }, { $pull: { wishlistedGames: gameId } });
                res.status(201).send({ message: "Game removed from wishlist" });
                logger.info("Game " + gameId + " removed from wishlist user" + publicKey + ".");
            } else {
                await User.updateOne({ publicKey }, { $addToSet: { wishlistedGames: gameId } });
                res.status(200).send({ message: "Game added to wishlist" });
                logger.info("Game " + gameId + " added to wishlist user" + publicKey + ".");
            }
        } else {
            await User.create({ publicKey, wishlistedGames: [gameId] });
            logger.info("User " + publicKey + " created.");
            res.status(200).send({ message: "Game added to wishlist" });
            logger.info("Game " + gameId + " added to wishlist user" + publicKey + ".");
        }
    } catch (err) {
        logger.error(err);
        res.status(500).send({ message: "Error when adding game to wishlist" });
    }
});

router.get("/:publicKey", authenticateToken, async (req, res) => {
    const { publicKey } = req.params;

    if (!publicKey) {
        res.status(400).send({ message: "Public key not provided" });
        return;
    }

    if (!MINA_ADDRESS_REGEX.test(publicKey)) {
        res.status(400).send({ message: "Invalid public key" });
        return;
    }

    try {
        const user = await User.findOne({ publicKey });
        logger.info("Wishlist Sended user" + publicKey + ".");
        res.json(user ? user.wishlistedGames : []);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error retrieving wishlist" });
    }
});

export default router;
