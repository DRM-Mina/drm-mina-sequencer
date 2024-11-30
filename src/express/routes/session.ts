import express, { Router } from "express";
import logger from "../logger.js";
import {
    DeviceSession,
    DeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { VerificationKey, verify } from "o1js";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { Game } from "../db/schemas.js";

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || "6379";

console.log("Connecting to Redis at", redisHost, redisPort);

const connection = new IORedis({
    host: redisHost,
    port: parseInt(redisPort),
    password: process.env.REDIS_PASSWRD,
    maxRetriesPerRequest: null,
});

const router: Router = express.Router();

let verificationKey: VerificationKey;

router.post("/", async (req, res) => {
    try {
        const { proof } = req.body;

        if (!verificationKey) {
            const { verificationKey: vk } = await DeviceSession.compile();
            verificationKey = vk;
        }

        if (!proof) {
            res.status(400).send({ message: "Proof not provided" });
            return;
        }

        const sessionProof: DeviceSessionProof = await DeviceSessionProof.fromJSON(
            JSON.parse(proof)
        );

        const ok = await verify(sessionProof, verificationKey);

        if (!ok) {
            logger.error("Proof verification failed");
            res.status(400).send({ message: "Invalid proof" });
            return;
        }

        logger.info("Proof verified");

        const gameTokenAddress = sessionProof.publicInput.gameToken.toBase58();
        const gameTokenAddressList = await getGameTokenContractList();

        if (!gameTokenAddressList.includes(gameTokenAddress)) {
            logger.error(`Not registered game token: ${gameTokenAddress}`);
            res.status(400).send({ message: "Game token not registered" });
            return;
        }

        const proofQueue = new Queue(`proofQueue${gameTokenAddress}`, {
            connection: connection,
        });

        await proofQueue.add(
            "addProof",
            { proof },
            {
                removeOnComplete: {
                    age: 300, // 5 minutes
                    count: 10,
                },
                removeOnFail: {
                    age: 300, // 5 minutes
                    count: 10,
                },
            }
        );
        logger.info("Proof added to queue: ", prettierAddress(gameTokenAddress));

        res.status(200).send({ message: "Proof submitted" });
    } catch (err) {
        logger.error(`Error submitting session: ${err}`);
        res.status(500).send({ message: "Error submitting session" });
    }
});

async function getGameTokenContractList() {
    const gameTokenAddresses = await Game.find({}, { gameTokenContractAddress: 1, _id: 0 });
    return gameTokenAddresses.map((game) => game.gameTokenContractAddress);
}
function prettierAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-6)}`;
}

export default router;
