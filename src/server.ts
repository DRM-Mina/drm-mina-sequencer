import { MINA_ADDRESS_REGEX } from "./utils.js";
import { Game, User } from "./schemas.js";
import mongoose from "mongoose";
import logger from "./logger";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import serveStatic from "serve-static";
import { Field, PrivateKey, PublicKey, Signature } from "o1js";
import AWS from "aws-sdk";
import Client from "mina-signer";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

dotenv.config();

const senderKey = PrivateKey.random();
const sender = senderKey.toPublicKey();
let nonce = 0;

const s3 = new AWS.S3({
    // @ts-ignore
    endpoint: new AWS.Endpoint(process.env.CF_ENDPOINT),
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
});

//@ts-ignore
mongoose.connect(process.env.MONGO);
const mongoDb = mongoose.connection;
mongoDb.on("error", (err) => {
    logger.error("MongoDB connection error:", err);
});

mongoDb.once("open", function () {
    logger.info("Connected successfully to MongoDB");
});

const verifyClient = new Client({ network: "testnet" });

const app = express();
const port = 3333;

app.use(cors());
app.use(express.json());
app.use(serveStatic("public"));

app.get("/game-data", async (req, res) => {
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

const nonces = new Map();

app.get("/auth/challenge/:publicKey", (req, res) => {
    const { publicKey } = req.params;

    if (!publicKey) {
        return res.status(400).send({ message: "Public key not provided" });
    }

    if (!MINA_ADDRESS_REGEX.test(publicKey)) {
        return res.status(400).send({ message: "Invalid public key" });
    }

    const nonce = Field.random().toString();
    nonces.set(publicKey, nonce);

    // Remove the nonce after 5 minutes to prevent reuse
    setTimeout(() => nonces.delete(publicKey), 5 * 60 * 1000);

    res.json({ nonce });
});

app.post("/auth/verify", async (req, res) => {
    const { signature } = req.body;

    if (!signature) {
        return res.status(400).send({ message: "Missing signature" });
    }

    try {
        const verifyResult = verifyClient.verifyMessage(signature);
        const { publicKey, data } = signature;

        logger.info("Signature request from " + publicKey);

        const storedNonce = nonces.get(publicKey);
        if (!storedNonce || BigInt(storedNonce) !== BigInt(data)) {
            return res.status(400).send({ message: "Invalid nonce" });
        }
        if (verifyResult) {
            nonces.delete(publicKey);

            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET environment variable is not defined");
            }

            const token = jwt.sign({ publicKey }, process.env.JWT_SECRET, { expiresIn: "1h" });

            logger.info("Token generated " + token);
            res.json({ message: "Authentication successful", token });
        } else {
            logger.error("Invalid signature");
            res.status(400).send({ message: "Invalid signature" });
        }
    } catch (err) {
        logger.error(err);
        res.status(500).send({ message: "Error verifying signature" });
    }
});

function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).send({ message: "No token provided" });

    if (!process.env.JWT_SECRET) {
        logger.error("JWT_SECRET environment variable is not defined");
        return res.status(500).send({ message: "Internal server error" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.error(err);
            return res.status(403).send({ message: "Invalid token" });
        }
        // req.user = user;
        next();
    });
}

app.post("/wishlist", authenticateToken, async (req, res) => {
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

app.get("/wishlist", authenticateToken, async (req, res) => {
    const { publicKey, gameId } = req.body;

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
        logger.error(err);
        res.status(500).send({ message: "Error retrieving wishlist" });
    }
});

app.post("/slot-names", authenticateToken, async (req, res) => {
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

const getSignedUrlLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.post("/get-signed-url", getSignedUrlLimiter, async (req, res) => {
    const { fileName } = req.body;

    if (!fileName) {
        res.status(400).send({ message: "File name not provided" });
        return;
    }

    try {
        const params = {
            Bucket: process.env.CF_BUCKET,
            Key: fileName,
            Expires: 600,
        };
        const url = s3.getSignedUrl("getObject", params);
        logger.info("Signed URL generated: " + url);
        res.status(201).send({ url });
    } catch (err) {
        logger.error(err);
        res.status(506).send({ message: "Error generating signed url" });
    }
});

app.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}`);
});
