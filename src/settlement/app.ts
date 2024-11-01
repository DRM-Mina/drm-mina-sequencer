import logger from "./logger.js";
import {
    compileContracts,
    fetchActions,
    getDRMInstances,
    initializeMinaInstance,
    settle,
} from "./utils.js";

const MIN_ACTIONS_TO_REDUCE = 10;
const MAX_WAIT_MS = 1000 * 60 * 5; // 5 minutes

initializeMinaInstance();
await compileContracts();

const instances = getDRMInstances();

async function settlementCycle() {
    for (let i = 0; i < instances.length; i++) {
        logger.info("Checking actions for", instances[i].contractAddress);
        const actions = await fetchActions(instances[i].contract);
        logger.info(`${actions} actions pending for ${instances[i].contractAddress}`);
        logger.info(
            "Since last settlement:",
            (Date.now() - instances[i].startTime) / 1000,
            "seconds"
        );
        let shouldSettle =
            actions > 0 &&
            (actions >= MIN_ACTIONS_TO_REDUCE || instances[i].startTime + MAX_WAIT_MS < Date.now());

        if (shouldSettle) {
            try {
                logger.info(`Settling actions for ${instances[i].contractAddress}`);
                await settle(instances[i].contract);
                instances[i].startTime = Date.now();
                logger.info(`Settled actions for ${instances[i].contractAddress}`);
            } catch (err) {
                logger.error("Error settling actions:", err);
            }
        } else if (actions === 0) {
            instances[i].startTime = Date.now();
        }
    }

    setTimeout(settlementCycle, 1000 * 60 * 1); // 1 minute
}

settlementCycle();
