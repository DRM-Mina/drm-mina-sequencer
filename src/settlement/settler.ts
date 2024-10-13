import dotenv from "dotenv";
import { checkEnv, settlementCycle } from "./utils.js";
import { Mina, PrivateKey } from "o1js";
import { CycleConfig, SettlementConfig } from "./types.js";
import { DRM } from "drm-mina-contracts";

dotenv.config();

const minaEndpoint = checkEnv(process.env.MINA_ENDPOINT, "MISSING MINA_ENDPOINT");
const archiveEndpoint = checkEnv(process.env.ARCHIVE_ENDPOINT, "MISSING ARCHIVE_ENDPOINT");

const feepayerKey = PrivateKey.fromBase58(
    checkEnv(process.env.FEE_PAYER_KEY, "MISSING FEE_PAYER_KEY")
);

const RETRY_WAIT_MS = Number(process.env.RETRY_WAIT_MS) || 60_000;
const MIN_ACTIONS_TO_REDUCE = Number(process.env.MIN_ACTIONS_TO_REDUCE) || 6;
const MAX_RETRIES_BEFORE_REDUCE = Number(process.env.MAX_RETRIES_BEFORE_REDUCE) || 100;

const config: SettlementConfig = {
    RETRY_WAIT_MS,
    MIN_ACTIONS_TO_REDUCE,
    MAX_RETRIES_BEFORE_REDUCE,
};

const settlementCycleConfig: CycleConfig = {
    drm: DRM,
    feepayerKey: feepayerKey,
    counter: 0,
    config: config,
};

const Network = Mina.Network({
    mina: minaEndpoint,
    archive: archiveEndpoint,
});
Mina.setActiveInstance(Network);

await settlementCycle(settlementCycleConfig);
