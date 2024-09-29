import { DRM, offchainState, StateProof } from "drm-mina-contracts";
import { Mina } from "o1js";
import { CycleConfig, SettlementInputs } from "./types.js";

export function checkEnv(input: string | undefined, message: string): string {
    if (input === undefined) {
        throw new Error(message);
    }
    return input;
}

export async function fetchActions(drm: DRM): Promise<number> {
    let latest_offchain_commitment = await drm.offchainState.fetch();
    const actionStateRange = {
        fromActionState: latest_offchain_commitment?.actionState,
    };

    let result = await Mina.fetchActions(drm.address, actionStateRange);
    if ("error" in result) throw Error(JSON.stringify(result));
    let actions = result.reduce((accumulator, currentItem) => {
        return (
            accumulator +
            currentItem.actions.reduce((innerAccumulator) => {
                return innerAccumulator + 1;
            }, 0)
        );
    }, 0);

    return actions;
}

export async function settle({ drm, feepayerKey }: SettlementInputs) {
    let proof: StateProof;
    const feePayer = feepayerKey.toPublicKey();
    console.time("settlement proof");
    try {
        proof = await offchainState.createSettlementProof();
    } finally {
        console.timeEnd("settlement proof");
        try {
            let tx = await Mina.transaction(feePayer, async () => {
                await drm.settle(proof);
            });
            await tx.prove();
            const sentTx = await tx.sign([feepayerKey]).send();
            console.log(sentTx.toPretty());
            if (sentTx.status === "pending") {
                console.log(`https://minascan.io/devnet/tx/${sentTx.hash}?type=zk-tx`);
            }
        } catch (error) {
            console.log(error);
        }
    }
}

export async function settlementCycle({ drm, feepayerKey, counter = 0, config }: CycleConfig) {
    try {
        const actions = await fetchActions(drm);
        let shouldSettle =
            actions > 0 &&
            (actions > config.MIN_ACTIONS_TO_REDUCE || counter > config.MAX_RETRIES_BEFORE_REDUCE);
        if (actions === 0) {
            setTimeout(settlementCycle, config.RETRY_WAIT_MS, {
                drm,
                feepayerKey,
                counter,
                config,
            });
        } else if (shouldSettle) {
            await settle({ drm, feepayerKey });
            counter = 0;
            setTimeout(settlementCycle, config.RETRY_WAIT_MS, {
                drm,
                feepayerKey,

                counter,
                config,
            });
        } else {
            counter++;
            setTimeout(settlementCycle, config.RETRY_WAIT_MS, {
                drm,
                feepayerKey,
                counter,
                config,
            });
        }
    } catch (error) {
        console.log(error);
        setTimeout(settlementCycle, config.RETRY_WAIT_MS, {
            drm,
            feepayerKey,
            counter,
            config,
        });
    }
}
