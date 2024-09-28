import { parentPort, workerData } from "worker_threads";
import { DeviceSessionProof } from "drm-mina-contracts";
import { JsonProof } from "o1js";

if (!parentPort) {
    throw new Error("parentPort is undefined.");
}

const { contractAddresses } = workerData;

(async () => {
    try {
        await initializeWorker();

        parentPort.postMessage({ type: "initialized" });

        parentPort.on("message", async (proof: string) => {
            try {
                const sessionProof = await DeviceSessionProof.fromJSON(
                    JSON.parse(proof) as JsonProof
                );

                // Proof generation

                parentPort!.postMessage({
                    success: true,
                    newSessionKey: sessionProof.publicOutput.newSessionKey.toString(),
                });
            } catch (err: any) {
                parentPort!.postMessage({
                    success: false,
                    error: err.message || "An error occurred in the worker thread.",
                });
            }
        });
    } catch (err: any) {
        parentPort.postMessage({
            type: "initError",
            error: err.message || "An error occurred during worker initialization.",
        });
    }
})();

async function initializeWorker() {}
