import express, { Router } from "express";
import logger from "../logger.js";
import {
    DeviceSession,
    DeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { VerificationKey, verify } from "o1js";
import { Queue } from "bullmq";

const router: Router = express.Router();

let verificationKey: VerificationKey;

const proofQueue = new Queue("proofQueue");
await proofQueue.setGlobalConcurrency(1);

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

        const sessionProof = await DeviceSessionProof.fromJSON(JSON.parse(proof));

        const ok = await verify(sessionProof, verificationKey);

        if (!ok) {
            logger.error("Proof verification failed");
            res.status(400).send({ message: "Invalid proof" });
            return;
        }
        if (ok) {
            logger.info("Proof verified");
        }

        await proofQueue.add(
            "addProof",
            { proof },
            {
                removeOnComplete: {
                    age: 600, // 10 minutes
                    count: 10,
                },
                removeOnFail: {
                    age: 600, // 10 minutes
                    count: 10,
                },
            }
        );
        console.log("added proof to queue");

        res.status(200).send({ message: "Proof submitted" });
    } catch (err) {
        logger.error("Failed to process request");
        res.status(500).send({ message: "Error submitting session" });
    }
});

export default router;
