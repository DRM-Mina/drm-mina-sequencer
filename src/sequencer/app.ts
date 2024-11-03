import { Worker } from "bullmq";
import Bundler from "./bundler.js";
import { initializeMinaInstance, compileContracts } from "./utils.js";
import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { PublicKey } from "o1js";
import IORedis from "ioredis";
import logger from "./logger.js";

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || "6379";

console.log("Connecting to Redis at", redisHost, redisPort);

const connection = new IORedis({
    host: redisHost,
    port: parseInt(redisPort),
    maxRetriesPerRequest: null,
});

async function initializeWorker() {
    console.log("Initializing worker");
    console.log("Initializing Mina instance");
    initializeMinaInstance();

    console.log("Compiling contracts");
    const verificationKey = await compileContracts();
    console.log("Verification key:", verificationKey?.hash.toString());

    const GameTokenPubkey = PublicKey.fromBase58(process.env.GAME_TOKEN_ADDR3!);
    const DRMInstance = new DRM(PublicKey.fromBase58(process.env.DRM_ADDR3!));
    DRMInstance.offchainState.setContractInstance(DRMInstance);

    const bundler = Bundler.getInstance();
    bundler.setGameToken(GameTokenPubkey, DRMInstance);

    const worker = new Worker(
        "proofQueue",
        async (job) => {
            console.log(`Processing job ${job.id}`);
            console.log("job name:", job.name);
            const { proof } = job.data;
            try {
                await bundler.addProof(proof);
                logger.info(`Proof ${job.id} added to bundler`);
            } catch (err) {
                logger.error(`Failed to add proof ${job.id} to bundler: ${err}`);
                throw err;
            }
        },
        {
            connection,
            concurrency: 1,
            lockDuration: 60000, // 1 minute
        }
    );

    worker.on("completed", (job) => {
        console.log(`Job ${job.id} has completed`);
    });

    worker.on("failed", (job) => {
        console.error(`Job has failed with error: ${job?.failedReason}`);
    });

    worker.on("error", (err) => {
        console.error("Worker error:", err);
    });

    console.log("Worker is listening for jobs");
}

initializeWorker().catch((err) => {
    console.error("Failed to initialize worker:", err);
    process.exit(1);
});
