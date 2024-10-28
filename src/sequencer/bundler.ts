import { DeviceSessionProof, DRM } from "drm-mina-contracts";
import {
    BundledDeviceSession,
    BundledDeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof";
import { Mina, PrivateKey, PublicKey } from "o1js";
import { checkEnv } from "./utils";
import logger from "./logger";

export default class Bundler {
    private static instance: Bundler;
    private gameTokenPubKey: PublicKey | undefined;
    private drmInstance: DRM | undefined;
    private proofQueue: DeviceSessionProof[];
    private baseProof: BundledDeviceSessionProof | undefined;
    private currentBundledProof: BundledDeviceSessionProof | undefined;
    private currentBundledCount: number;
    private bundleStartTime: number | undefined;
    private checkInterval: NodeJS.Timeout;
    private feePayerPubKey: PublicKey;
    private feePayerPrivKey: PrivateKey;

    private constructor() {
        this.proofQueue = [];
        this.baseProof = undefined;
        this.currentBundledCount = 0;
        this.gameTokenPubKey = undefined;
        this.checkInterval = setInterval(() => this.checkBundle(), 60000);

        const feePayerPrivKeyString = checkEnv(process.env.FEE_PAYER_KEY, "MISSING FEE_PAYER_KEY");
        this.feePayerPrivKey = PrivateKey.fromBase58(feePayerPrivKeyString);
        this.feePayerPubKey = this.feePayerPrivKey.toPublicKey();
    }

    public static getInstance(): Bundler {
        if (!Bundler.instance) {
            Bundler.instance = new Bundler();
        }
        return Bundler.instance;
    }

    private async checkBundle(): Promise<void> {
        const currentTime = Date.now();

        if (
            this.bundleStartTime &&
            this.currentBundledCount > 0 &&
            currentTime - this.bundleStartTime >= 3 * 60 * 1000 // 3 min
        ) {
            await this.sendBundle();
        }
    }

    public setBaseProof(baseProof: BundledDeviceSessionProof): void {
        this.baseProof = baseProof;
    }

    public setGameToken(gameTokenPubKey: PublicKey, drmInstance: DRM): void {
        this.gameTokenPubKey = gameTokenPubKey;
        this.drmInstance = drmInstance;
    }

    public addProof(proof: DeviceSessionProof): void {
        for (const p of this.proofQueue) {
            if (p.publicOutput.hash.toBigInt() === proof.publicOutput.hash.toBigInt()) {
                throw new Error("Proof for this device already in queue");
            }
        }
        this.proofQueue.push(proof);
    }

    public async bundleProof(): Promise<void> {
        while (this.proofQueue.length > 0 && this.currentBundledCount < 4) {
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

            this.currentBundledProof = await BundledDeviceSession.appendToBundle(
                this.gameTokenPubKey,
                proof,
                this.currentBundledProof
            );

            this.currentBundledCount++;
        }

        if (this.currentBundledCount >= 4) {
            await this.sendBundle();
        }
    }

    private async sendBundle(): Promise<void> {
        if (!this.currentBundledProof) {
            throw new Error("Current bundled proof not set");
        }

        console.log("Sending bundle");

        const bundleTx = Mina.transaction(
            {
                sender: this.feePayerPubKey,
                fee: 1e8,
            },
            async () => {
                this.drmInstance?.submitBudledDeviceSessionProof(this.currentBundledProof!);
            }
        );

        await bundleTx.prove();
        const pendingTx = await bundleTx.sign([this.feePayerPrivKey]).send();
        logger.info(`Bundle sent: https://minascan.io/devnet/tx/${pendingTx.hash}`);
        logger.info(
            `Bundle count: ${this.currentBundledCount}, time: ${
                (Date.now() - this.bundleStartTime!) / 1000
            }s`
        );

        this.currentBundledProof = this.baseProof;
        this.currentBundledCount = 0;
        this.bundleStartTime = undefined;
    }

    public stop(): void {
        clearInterval(this.checkInterval);
    }
}
