import { fetchAccount, fetchLastBlock, Mina, PrivateKey, PublicKey } from "o1js";
import { DRM, offchainState, StateProof } from "drm-mina-contracts/build/src/DRM.js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";
import { DeviceIdentifier } from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof.js";
import { DeviceSession } from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { BundledDeviceSession } from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof.js";
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();

const minaEndpoint = checkEnv(process.env.MINA_ENDPOINT, "MISSING MINA_ENDPOINT");
const archiveEndpoint = checkEnv(process.env.ARCHIVE_ENDPOINT, "MISSING ARCHIVE_ENDPOINT");

export function checkEnv(input: string | undefined, message: string): string {
    if (input === undefined) {
        throw new Error(message);
    }
    return input;
}

export function initializeMinaInstance() {
    const Network = Mina.Network({
        mina: minaEndpoint,
        archive: archiveEndpoint,
    });
    Mina.setActiveInstance(Network);
}

export async function fetchActions(drm: DRM): Promise<number> {
    try {
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
    } catch (error) {
        throw new Error(`Error fetching actions: ${error}`);
    }
}

export async function settle(drm: DRM, feepayerKey: PrivateKey, nonce: number): Promise<void> {
    let proof: StateProof;
    const feePayer = feepayerKey.toPublicKey();

    try {
        logger.info("Creating settlement proof");
        const currentTime = Date.now();
        proof = await drm.offchainState.createSettlementProof();
        logger.info(`Settlement proof created in ${(Date.now() - currentTime) / 1000} seconds`);
    } catch (err) {
        throw new Error(`Error creating settlement proof: ${err}`);
    }
    let tx;
    const currentTime = Date.now();
    try {
        logger.info("Creating settlement transaction");
        tx = await Mina.transaction(
            {
                sender: feePayer,
                fee: 1e8,
                nonce: nonce,
            },
            async () => {
                await drm.settle(proof);
            }
        );
        await tx.prove();
        logger.info(
            `Settlement transaction created in ${
                (Date.now() - currentTime) / 1000
            } seconds sending...`
        );
    } catch (err) {
        throw new Error(`Error creating settlement tx: ${err}`);
    }
    try {
        const sentTx = await tx.sign([feepayerKey]).send();
        if (sentTx.status === "pending") {
            logger.info(
                `Settlement submitted https://minascan.io/devnet/tx/${sentTx.hash}?type=zk-tx in ${
                    (Date.now() - currentTime) / 1000
                } seconds`
            );
        } else {
            logger.error(`Settlement failed: ${sentTx.status}`);
        }
    } catch (err) {
        throw new Error(`Error sending settlement tx: ${err}`);
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
        throw new Error(`Error compiling contracts: ${err}`);
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
            lastAttemptBlock: 0,
        },
        {
            contract: drm2,
            contractAddress: process.env.DRM_ADDR2!,
            startTime: 0,
            lastAttemptBlock: 0,
        },
        {
            contract: drm3,
            contractAddress: process.env.DRM_ADDR3!,
            startTime: 0,
            lastAttemptBlock: 0,
        },
    ];
}

export async function getNonce(feepayerKey: PrivateKey) {
    const pubkey = feepayerKey.toPublicKey();
    await fetchAccount({ publicKey: pubkey });

    const account = Mina.getAccount(pubkey);
    return Number(account.nonce.toBigint());
}

export async function getBlockHeight() {
    const block = await fetchLastBlock(minaEndpoint);
    return Number(block.blockchainLength.toBigint());
}
