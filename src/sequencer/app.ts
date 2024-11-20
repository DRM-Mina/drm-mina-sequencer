import { Worker } from "bullmq";
import Bundler from "./bundler.js";
import { initializeMinaInstance, compileContracts } from "./utils.js";
import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { PublicKey } from "o1js";
import IORedis from "ioredis";
import logger from "./logger.js";

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || "6379";
const gameTokenAddress = process.env.GAME_TOKEN_ADDRESS;
const drmAddress = process.env.DRM_ADDRESS;

if (!gameTokenAddress || !drmAddress) {
    throw new Error("Missing GAME_TOKEN_ADDRESS or DRM_ADDRESS");
}

console.log("Connecting to Redis at", redisHost, redisPort);

const connection = new IORedis({
    host: redisHost,
    port: parseInt(redisPort),
    password: process.env.REDIS_PASSWRD,
    maxRetriesPerRequest: null,
});

async function initializeWorker() {
    logger.info("Initializing worker");
    initializeMinaInstance();

    const GameTokenPubkey = PublicKey.fromBase58(gameTokenAddress!);
    const DRMPubkey = PublicKey.fromBase58(drmAddress!);

    await compileContracts(GameTokenPubkey);
    logger.info("Contracts compiled");

    const DRMInstance = new DRM(DRMPubkey);
    DRMInstance.offchainState.setContractInstance(DRMInstance);

    const bundler = Bundler.getInstance();
    bundler.setGameToken(GameTokenPubkey, DRMInstance, DRMPubkey);

    const worker = new Worker(
        `proofQueue${gameTokenAddress}`,
        async (job) => {
            logger.info(`Processing job ${job.id}`);
            const { proof } = job.data;
            try {
                await bundler.addProof(proof);
                logger.info(`Proof ${job.id} added to bundler`);
            } catch (err) {
                logger.error(`Failed to add proof ${job.id} to bundler: ${err}`);
                throw err; // This will cause the job to be requeued
            }
        },
        {
            connection,
            concurrency: 1,
            lockDuration: 60000, // 1 minute
        }
    );

    worker.on("completed", (job) => {
        logger.info(`Job ${job.id} has completed`);
    });

    worker.on("failed", (job) => {
        logger.error(`Job has failed with error: ${job?.failedReason}`);
    });

    worker.on("error", (err) => {
        logger.error("Worker error:", err);
    });

    logger.info("Worker is listening for jobs");
}

initializeWorker().catch((err) => {
    console.error("Failed to initialize worker:", err);
    process.exit(1);
});
