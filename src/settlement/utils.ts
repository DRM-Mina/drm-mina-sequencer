import { Mina, PrivateKey, PublicKey } from "o1js";
import { DRM, offchainState, StateProof } from "drm-mina-contracts/build/src/DRM.js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";
import { DeviceIdentifier } from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof.js";
import { DeviceSession } from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { BundledDeviceSession } from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof.js";
import dotenv from "dotenv";
dotenv.config();

export function checkEnv(input: string | undefined, message: string): string {
    if (input === undefined) {
        throw new Error(message);
    }
    return input;
}

export function initializeMinaInstance() {
    const minaEndpoint = checkEnv(process.env.MINA_ENDPOINT, "MISSING MINA_ENDPOINT");
    const archiveEndpoint = checkEnv(process.env.ARCHIVE_ENDPOINT, "MISSING ARCHIVE_ENDPOINT");

    const Network = Mina.Network({
        mina: minaEndpoint,
        archive: archiveEndpoint,
    });
    Mina.setActiveInstance(Network);
}

export async function fetchActions(drm: DRM): Promise<number> {
    let latest_offchain_commitment = await drm.offchainStateCommitments.fetch();
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

export async function settle(drm: DRM): Promise<void> {
    let proof: StateProof;
    const feepayerKey = PrivateKey.fromBase58(
        checkEnv(process.env.FEE_PAYER_KEY, "MISSING FEE_PAYER_KEY")
    );
    const feePayer = feepayerKey.toPublicKey();
    console.time("settlement proof");
    try {
        proof = await drm.offchainState.createSettlementProof();
    } finally {
        console.timeEnd("settlement proof");
        try {
            let tx = await Mina.transaction(
                {
                    sender: feePayer,
                    fee: 1e8,
                },
                async () => {
                    await drm.settle(proof);
                }
            );
            await tx.prove();
            const sentTx = await tx.sign([feepayerKey]).send();
            console.log(sentTx.toPretty());
            if (sentTx.status === "pending") {
                console.log(`https://minascan.io/devnet/tx/${sentTx.hash}?type=zk-tx`);
            }
        } catch (error) {
            throw new Error(`${error}`);
        }
    }
}

export async function compileContracts() {
    try {
        console.time("GameToken.compile");
        await GameToken.compile();
        console.timeEnd("GameToken.compile");

        console.time("DeviceIdentifier compile");
        await DeviceIdentifier.compile();
        console.timeEnd("DeviceIdentifier compile");

        console.time("DeviceSession compile");
        await DeviceSession.compile();
        console.timeEnd("DeviceSession compile");

        console.time("BundledDeviceSession compile");
        await BundledDeviceSession.compile();
        console.timeEnd("BundledDeviceSession compile");

        console.time("offchainState compile");
        await offchainState.compile();
        console.timeEnd("offchainState compile");

        console.time("DRM compile");
        await DRM.compile();
        console.timeEnd("DRM compile");
    } catch (err) {
        console.error(err);
    }
}

export function getDRMInstances() {
    const drm1 = new DRM(PublicKey.fromBase58(process.env.DRM_ADDR1!));
    drm1.offchainState.setContractInstance(drm1);

    const drm2 = new DRM(PublicKey.fromBase58(process.env.DRM_ADDR2!));
    drm2.offchainState.setContractInstance(drm2);

    const drm3 = new DRM(PublicKey.fromBase58(process.env.DRM_ADDR3!));
    drm3.offchainState.setContractInstance(drm3);

    return [
        {
            contract: drm1,
            contractAddress: process.env.DRM_ADDR1!,
            startTime: 0,
        },
        {
            contract: drm2,
            contractAddress: process.env.DRM_ADDR2!,
            startTime: 0,
        },
        {
            contract: drm3,
            contractAddress: process.env.DRM_ADDR3!,
            startTime: 0,
        },
    ];
}
