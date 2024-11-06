import { PrivateKey } from "o1js";
import logger from "./logger.js";
import {
    checkEnv,
    compileContracts,
    fetchActions,
    getDRMInstances,
    getNonce,
    initializeMinaInstance,
    settle,
} from "./utils.js";

const MIN_ACTIONS_TO_REDUCE = 4;
const MAX_WAIT_MS = 1000 * 60 * 5; // 5 minutes

const feepayerKey = PrivateKey.fromBase58(
    checkEnv(process.env.SETTLEMENT_FEE_PAYER_KEY, "MISSING SETTLEMENT_FEE_PAYER_KEY")
);

initializeMinaInstance();
await compileContracts();

const instances = getDRMInstances();
let feepayerNonce = await getNonce(feepayerKey);

async function settlementCycle() {
    for (let i = 0; i < instances.length; i++) {
        let actions;
        try {
            actions = await fetchActions(instances[i].contract);
        } catch (err) {
            logger.error(err);
            continue;
        }
        if (actions > 0) {
            logger.info(
                `${actions} unsettled actions found for ${instances[i].contractAddress}, ${
                    (Date.now() - instances[i].startTime - MAX_WAIT_MS) / 1000
                } seconds until settle`
            );
        }
        let shouldSettle =
            actions > 0 &&
            (actions >= MIN_ACTIONS_TO_REDUCE || instances[i].startTime + MAX_WAIT_MS < Date.now());

        if (shouldSettle) {
            try {
                await settle(instances[i].contract, feepayerKey, feepayerNonce);
                instances[i].startTime = Date.now();
                feepayerNonce++;
            } catch (err) {
                logger.error(`Error settling ${instances[i].contractAddress}: ${err}`);
            }
        } else if (actions === 0) {
            instances[i].startTime = Date.now();
        }
    }

    setTimeout(settlementCycle, 1000 * 60 * 1); // 1 minute
}

settlementCycle();
