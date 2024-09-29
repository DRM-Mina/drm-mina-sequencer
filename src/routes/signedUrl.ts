import express, { Router } from "express";
import AWS from "aws-sdk";
import rateLimit from "express-rate-limit";
import logger from "../logger";
import dotenv from "dotenv";
dotenv.config();

const router: Router = express.Router();

const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(process.env.CF_ENDPOINT as string),
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
});

const getSignedUrlLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/", getSignedUrlLimiter, async (req, res) => {
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

export default router;