import express, { Router } from "express";
import axios from "axios";
import logger from "../logger.js";
import {
    DeviceSession,
    DeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { VerificationKey, verify } from "o1js";

const router: Router = express.Router();

let verificationKey: VerificationKey;

const sequencerUrl = "http://localhost:3334";

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

        logger.info("Session received from ip:", req.ip);

        const sessionProof = await DeviceSessionProof.fromJSON(JSON.parse(proof));

        // const ok = await verify(sessionProof, verificationKey);

        // if (!ok) {
        //     res.status(400).send({ message: "Invalid proof" });
        //     return;
        // }
        // if (ok) {
        //     logger.info("Proof verified");
        // }

        console.log("Sending proof to sequencer", proof);
        const response = await axios.post(`${sequencerUrl}/`, {
            proof: proof,
        });

        if (response.status === 200) {
            res.status(200).send({ message: "Session submitted and verified by sequencer" });
        } else {
            res.status(400).send({ message: "Sequencer rejected the session" });
        }
    } catch (err) {
        logger.error(err);
        res.status(500).send({ message: "Error submitting session" });
    }
});

export default router;
