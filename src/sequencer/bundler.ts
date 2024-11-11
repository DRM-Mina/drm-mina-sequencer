import {
    BundledDeviceSession,
    BundledDeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof.js";
import { fetchAccount, Mina, PrivateKey, PublicKey } from "o1js";
import { checkEnv, prettierAddress } from "./utils.js";
import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { DeviceSessionProof } from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import logger from "./logger.js";

const BUNDLE_WAIT_TIME = 2 * 60 * 1000; // 2 min

export default class Bundler {
    private static instance: Bundler;
    private gameTokenPubKey: PublicKey | undefined;
    private drmPubKey: PublicKey | undefined;
    private drmInstance: DRM | undefined;
    private proofQueue: DeviceSessionProof[];
    private baseProof: BundledDeviceSessionProof | undefined;
    private currentBundledProof: BundledDeviceSessionProof | undefined;
    private currentBundledCount: number;
    private bundleStartTime: number | undefined;
    private checkInterval: NodeJS.Timeout;
    private feePayerPubKey: PublicKey;
    private feePayerPrivKey: PrivateKey;
    private isBundleInProgress: boolean;
    private bundleSendingTrial: number;

    private constructor() {
        this.proofQueue = [];
        this.baseProof = undefined;
        this.currentBundledCount = 0;
        this.gameTokenPubKey = undefined;
        this.drmPubKey = undefined;
        this.checkInterval = setInterval(() => this.checkBundle(), 60000);

        const feePayerPrivKeyString = checkEnv(
            process.env.SEQUENCER_FEE_PAYER_KEY,
            "MISSING SEQUENCER_FEE_PAYER_KEY"
        );
        this.feePayerPrivKey = PrivateKey.fromBase58(feePayerPrivKeyString);
        this.feePayerPubKey = this.feePayerPrivKey.toPublicKey();
        this.isBundleInProgress = false;
        this.bundleSendingTrial = 0;
    }

    public static getInstance(): Bundler {
        if (!Bundler.instance) {
            Bundler.instance = new Bundler();
        }
        return Bundler.instance;
    }

    private async checkBundle(): Promise<void> {
        const currentTime = Date.now();
        console.log(
            `${this.currentBundledCount} proofs in bundle, ${this.proofQueue.length} in queue`
        );

        if (
            this.bundleStartTime &&
            this.currentBundledCount > 0 &&
            !this.isBundleInProgress &&
            currentTime - this.bundleStartTime >= BUNDLE_WAIT_TIME
        ) {
            try {
                await this.sendBundle();
            } catch (e) {
                logger.error(`Error sending bundle: ${e}`);
            }
        }
    }

    public setBaseProof(baseProof: BundledDeviceSessionProof): void {
        this.baseProof = baseProof;
    }

    public setGameToken(gameTokenPubKey: PublicKey, drmInstance: DRM, drmPubKey: PublicKey): void {
        this.gameTokenPubKey = gameTokenPubKey;
        this.drmInstance = drmInstance;
        this.drmPubKey = drmPubKey;
    }

    public async addProof(jsonProof: string): Promise<void> {
        try {
            const proof = await DeviceSessionProof.fromJSON(JSON.parse(jsonProof));
            this.proofQueue.push(proof);
            logger.info(`Proof added to queue: ${this.proofQueue.length} proofs in queue`);
        } catch (e) {
            throw new Error(`Error adding proof to queue`);
        }

        if (!this.isBundleInProgress) {
            this.isBundleInProgress = true;
            try {
                await this.bundleProof();
            } catch (e) {
                throw e;
            }
        }
    }

    public async bundleProof(): Promise<void> {
        while (this.proofQueue.length > 0 && this.currentBundledCount < 4) {
            let newProof: BundledDeviceSessionProof | undefined;
            try {
                const proof = this.proofQueue.shift();

                if (!proof) {
                    break;
                }

                if (!this.baseProof) {
                    throw new Error("Base proof not set");
                }

                if (!this.gameTokenPubKey) {
                    throw new Error("Game token public key not set");
                }

                if (this.currentBundledCount === 0) {
                    this.currentBundledProof = this.baseProof;
                    this.bundleStartTime = Date.now();
                }

                if (!this.currentBundledProof) {
                    throw new Error("Current bundled proof not set");
                }
                logger.info(
                    `Trying to add current bundle ${
                        this.currentBundledProof.publicOutput.deviceCount
                    }th session ${prettierAddress(
                        proof.publicOutput.gameToken.toBase58()
                    )}: ${proof.publicOutput.currentSessionKey.toString()} -> ${proof.publicOutput.newSessionKey.toString()}`
                );
                newProof = await BundledDeviceSession.appendToBundle(
                    this.gameTokenPubKey,
                    proof,
                    this.currentBundledProof
                );
            } catch (e) {
                logger.error(`Error bundling proof: ${e}`);
            }
            if (newProof === undefined) {
                continue;
            }
            this.currentBundledProof = newProof;
            this.currentBundledCount++;
            logger.info(`Proof added to bundle: ${this.currentBundledCount} proofs in bundle`);
        }

        if (this.currentBundledCount >= 4) {
            try {
                await this.sendBundle();
            } catch (e) {
                logger.error(`Error sending bundle: ${e}`);
            }
        }
        this.isBundleInProgress = false;
    }

    private async sendBundle(): Promise<void> {
        try {
            if (!this.currentBundledProof) {
                throw new Error("Current bundled proof not set");
            }

            if (!this.feePayerPubKey) {
                throw new Error("Fee payer public key not set");
            }

            if (!this.feePayerPrivKey) {
                throw new Error("Fee payer private key not set");
            }

            if (!this.drmInstance) {
                throw new Error("DRM instance not set");
            }

            if (!this.drmPubKey) {
                throw new Error("DRM public key not set");
            }

            logger.info(
                `Session bundle tx creating bundle with ${this.currentBundledCount} proofs`
            );

            await fetchAccount({ publicKey: this.drmPubKey });

            const bundleSettleTx = await Mina.transaction(
                {
                    sender: this.feePayerPubKey,
                    fee: 1e8,
                },
                async () => {
                    await this.drmInstance!.submitBudledDeviceSessionProof(
                        this.currentBundledProof!
                    );
                }
            );

            await bundleSettleTx.prove();
            const pendingTx = await bundleSettleTx.sign([this.feePayerPrivKey]).send();
            logger.info(
                `Bundle sent: https://minascan.io/devnet/tx/${pendingTx.hash}, bundle count: ${
                    this.currentBundledCount
                }, takes: ${(Date.now() - this.bundleStartTime!) / 1000}s`
            );

            this.currentBundledProof = this.baseProof;
            this.currentBundledCount = 0;
            this.bundleStartTime = undefined;
            this.bundleSendingTrial = 0;
        } catch (e) {
            logger.error(`Error sending bundle: ${e}`);
            this.bundleSendingTrial++;

            logger.info("fetching actions");
            await Mina.fetchActions(this.drmPubKey!);
            logger.info("fetched actions");
            if (this.bundleSendingTrial >= 2) {
                logger.error(`Bundle sending failed after 2 trials, resetting bundle`);
                this.currentBundledProof = this.baseProof;
                this.currentBundledCount = 0;
                this.bundleStartTime = undefined;
                this.bundleSendingTrial = 0;
            }
        }
    }

    public stop(): void {
        clearInterval(this.checkInterval);
    }
}
