import { Worker } from "bullmq";
import Bundler from "./bundler.js";
import { initializeMinaInstance, compileContracts } from "./utils.js";
import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { PublicKey } from "o1js";
import IORedis from "ioredis";

const connection = new IORedis({
    host: "localhost",
    port: 6379,
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
            if (job.name === "addProof") {
                const { proof } = job.data;
                try {
                    await bundler.addProof(proof);
                } catch (err) {
                    console.error("Error processing proof:", err);
                    throw err;
                }
            }
        },
        {
            connection,
            concurrency: 1,
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

    console.log("Worker is running");
}

initializeWorker().catch((err) => {
    console.error("Failed to initialize worker:", err);
    process.exit(1);
});
