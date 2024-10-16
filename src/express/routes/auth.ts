import express, { Router } from "express";
import jwt from "jsonwebtoken";
import { Field } from "o1js";
import Client from "mina-signer";
import { MINA_ADDRESS_REGEX } from "../utils/constants.js";

import logger from "../logger.js";

const router: Router = express.Router();

const verifyClient = new Client({ network: "testnet" });
const nonces = new Map<string, string>();

router.get("/challenge/:publicKey", (req, res) => {
    const { publicKey } = req.params;

    if (!publicKey) {
        return res.status(400).send({ message: "Public key not provided" });
    }

    if (!MINA_ADDRESS_REGEX.test(publicKey)) {
        return res.status(400).send({ message: "Invalid public key" });
    }

    const nonce = Field.random().toString();
    nonces.set(publicKey, nonce);

    setTimeout(() => nonces.delete(publicKey), 5 * 60 * 1000);

    res.json({ nonce });
});

router.post("/verify", async (req, res) => {
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

export default router;
