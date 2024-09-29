import express, { Router } from "express";
import { User } from "../db/schemas";
import { authenticateToken } from "../middlewares/authenticateToken";
import { MINA_ADDRESS_REGEX } from "../utils/constants";

import logger from "../logger";

const router: Router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    const { publicKey, gameId, slotNames } = req.body;

    if (!gameId) {
        res.status(400).send({ message: "Game ID not provided" });
        return;
    }

    const gameIdNumber = Number(gameId);
    if (isNaN(gameIdNumber)) {
        res.status(400).send({ message: "Game ID must be a number" });
        return;
    }

    if (gameIdNumber < 0 || gameIdNumber > 30) {
        res.status(400).send({ message: "Invalid game ID" });
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

    const gameIdstr = String(gameIdNumber);

    if (slotNames) {
        if (!Array.isArray(slotNames)) {
            res.status(400).send({ message: "Slot names must be an array" });
            return;
        }

        if (slotNames.length > 4 || slotNames.length < 1) {
            res.status(400).send({ message: "Slot names must be between 1 and 4" });
            return;
        }

        if (slotNames.some((slotName) => typeof slotName !== "string")) {
            res.status(400).send({ message: "Slot names must be strings" });
            return;
        }

        try {
            const user = await User.findOne({ publicKey });
            if (user) {
                user.slots.set(gameIdstr, {
                    slots: user.slots.get(gameIdstr)?.slots || [],
                    slotNames: slotNames,
                });
                await user.save();
                res.status(200).send({ message: "Slots saved" });
                logger.info("Slots Saved user" + publicKey + ".");
            } else {
                res.status(404).send({ message: "User not found" });
                return;
            }
        } catch (err) {
            logger.error(err);
            res.status(500).send({ message: "Error saving slots" });
        }
    } else {
        try {
            const user = await User.findOne({ publicKey });
            if (user) {
                if (
                    user.slots.get(gameIdstr)?.slotNames &&
                    (user.slots.get(gameIdstr)?.slotNames.length || [].length) > 0
                ) {
                    logger.info("Slot Names Sended user" + publicKey + ".");
                    res.json(user.slots.get(gameIdstr)?.slotNames);
                } else {
                    user.slots.set(gameIdstr, {
                        slots: user.slots.get(gameIdstr)?.slots || [],
                        slotNames: ["Slot 1", "Slot 2", "Slot 3", "Slot 4"],
                    });
                    await user.save();
                    res.json(user.slots.get(gameIdstr)?.slotNames);
                    logger.info("Slot Names Sended user" + publicKey + ".");
                }
            } else {
                User.create({
                    publicKey,
                    slots: new Map([
                        [
                            gameIdstr,
                            {
                                slots: ["", "", "", ""],
                                slotNames: ["Slot 1", "Slot 2", "Slot 3", "Slot 4"],
                            },
                        ],
                    ]),
                });
                logger.info("User " + publicKey + " created.");
                res.json(["Slot 1", "Slot 2", "Slot 3", "Slot 4"]);
            }
        } catch (err) {
            logger.error(err);
            res.status(500).send({ message: "Error retrieving slots" });
        }
    }
});

export default router;
