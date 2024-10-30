import {
    BundledDeviceSession,
    BundledDeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof.js";
import { Mina, PrivateKey, PublicKey } from "o1js";
import { checkEnv } from "./utils.js";
import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { DeviceSessionProof } from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";

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
    private isBundleInProgress: boolean;

    private constructor() {
        this.proofQueue = [];
        this.baseProof = undefined;
        this.currentBundledCount = 0;
        this.gameTokenPubKey = undefined;
        this.checkInterval = setInterval(() => this.checkBundle(), 60000);

        const feePayerPrivKeyString = checkEnv(process.env.FEE_PAYER_KEY, "MISSING FEE_PAYER_KEY");
        this.feePayerPrivKey = PrivateKey.fromBase58(feePayerPrivKeyString);
        this.feePayerPubKey = this.feePayerPrivKey.toPublicKey();
        this.isBundleInProgress = false;
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
            `Checking bundle: ${this.currentBundledCount} proofs in bundle, ${this.proofQueue.length} in queue`
        );

        if (
            this.bundleStartTime &&
            this.currentBundledCount > 0 &&
            !this.isBundleInProgress &&
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

    public async addProof(jsonProof: string): Promise<void> {
        const proof = await DeviceSessionProof.fromJSON(JSON.parse(jsonProof));
        this.proofQueue.push(proof);
        console.log(`Proof added to queue: ${this.proofQueue.length} proofs in queue`);

        if (!this.isBundleInProgress) {
            this.isBundleInProgress = true;
            await this.bundleProof();
        }
    }

    public async bundleProof(): Promise<void> {
        while (this.proofQueue.length > 0 && this.currentBundledCount < 4) {
            console.log(`Bundling proof: ${this.currentBundledCount + 1}`);
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

            console.log(
                `Current bundled proof: ${this.currentBundledProof.publicOutput.deviceCount} devices`
            );
            console.log(
                `Proof to append: ${proof.publicOutput.gameToken.toBase58()}, ${proof.publicOutput.currentSessionKey.toString()}, ${proof.publicOutput.newSessionKey.toString()}`
            );
            this.currentBundledProof = await BundledDeviceSession.appendToBundle(
                this.gameTokenPubKey,
                proof,
                this.currentBundledProof
            );
            console.log(`Proof appended to bundle: ${this.currentBundledCount + 1}`);

            this.currentBundledCount++;
        }

        if (this.currentBundledCount >= 4) {
            await this.sendBundle();
        }
        this.isBundleInProgress = false;
    }

    private async sendBundle(): Promise<void> {
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

        console.log(`Sending bundle: ${this.currentBundledCount} proofs`);

        const bundleTx = Mina.transaction(
            {
                sender: this.feePayerPubKey,
                fee: 1e8,
            },
            async () => {
                await this.drmInstance!.submitBudledDeviceSessionProof(this.currentBundledProof!);
            }
        );

        await bundleTx.prove();
        const pendingTx = await bundleTx.sign([this.feePayerPrivKey]).send();
        console.log(`Bundle sent: https://minascan.io/devnet/tx/${pendingTx.hash}`);
        console.log(
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
