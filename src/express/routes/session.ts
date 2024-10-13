import express, { Router } from "express";
import logger from "../logger.js";
import { Worker } from "worker_threads";

const router: Router = express.Router();
let worker;
try {
    // worker = new Worker("./dist/worker.js", { workerData: { gameDataArray: [] } });
} catch (err) {
    logger.error(err);
}

router.post("/", async (req, res) => {
    const { proof } = req.body;

    if (!proof) {
        res.status(400).send({ message: "Proof not provided" });
        return;
    }

    logger.info("Session received");

    try {
        res.status(200).send({ message: "Session submitted" });
    } catch (err) {
        logger.error(err);
        res.status(500).send({ message: "Error submitting session" });
    }
});

export default router;
