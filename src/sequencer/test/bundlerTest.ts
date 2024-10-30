import { Identifiers } from "drm-mina-contracts/build/src/lib/DeviceIdentifier.js";
import { mockIdentifiers } from "./mock.js";
import { AccountUpdate, fetchAccount, Mina, PrivateKey, PublicKey, TokenId, UInt64 } from "o1js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";
import { DRM, offchainState } from "drm-mina-contracts/build/src/DRM.js";
import {
    DeviceIdentifier,
    DeviceIdentifierProof,
} from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof.js";
import {
    DeviceSession,
    DeviceSessionInput,
    DeviceSessionProof,
} from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";
import { BundledDeviceSession } from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const buyerCount = 5;
const privKeys = [
    PrivateKey.fromBase58(process.env.PK1!),
    PrivateKey.fromBase58(process.env.PK2!),
    PrivateKey.fromBase58(process.env.PK3!),
    PrivateKey.fromBase58(process.env.PK4!),
    PrivateKey.fromBase58(process.env.PK5!),
];

const pubKeys = privKeys.map((pk) => pk.toPublicKey());

let deviceIdentifiers: Identifiers[] = [];
for (const mockIdentifier of mockIdentifiers) {
    deviceIdentifiers.push(Identifiers.fromRaw(mockIdentifier));
}

let GameTokenPk: PrivateKey;
let GameTokenAddr: any;
let GameTokenInstance: GameToken;

let DRMPk: PrivateKey;
let DRMAddr: any;
let DRMInstance: DRM;

const Network = Mina.Network({
    mina: "https://api.minascan.io/node/devnet/v1/graphql",
    archive: "https://api.minascan.io/archive/devnet/v1/graphql",
});
Mina.setActiveInstance(Network);

console.time("Compile DeviceIdentifier");
await DeviceIdentifier.compile();
console.timeEnd("Compile DeviceIdentifier");
console.time("Compile DeviceSession");
await DeviceSession.compile();
console.timeEnd("Compile DeviceSession");
console.time("Compile BundledDeviceSession");
await BundledDeviceSession.compile();
console.timeEnd("Compile BundledDeviceSession");
console.time("Compile GameToken");
await GameToken.compile();
console.timeEnd("Compile GameToken");
console.time("Compile offchainState");
await offchainState.compile();
console.timeEnd("Compile offchainState");
console.time("Compile DRM");
await DRM.compile();
console.timeEnd("Compile DRM");

const initializeContracts = async () => {
    GameTokenAddr = PublicKey.fromBase58(process.env.GAME_TOKEN_ADDR3!);
    GameTokenInstance = new GameToken(GameTokenAddr);

    DRMAddr = PublicKey.fromBase58(process.env.DRM_ADDR3!);
    DRMInstance = new DRM(DRMAddr);
    DRMInstance.offchainState.setContractInstance(DRMInstance);
};

let deviceSessionProofs: DeviceIdentifierProof[] = [];
const createDeviceIdentifierProofs = async () => {
    for (let i = 0; i < buyerCount; i++) {
        console.time(`Proof for device ${i}`);
        const deviceIdentifierProof = await DeviceIdentifier.proofForDevice(deviceIdentifiers[i]);
        deviceSessionProofs.push(deviceIdentifierProof);
        console.timeEnd(`Proof for device ${i}`);
    }
};

const buyGames = async () => {
    const pendingTransactions = [];
    for (let i = 0; i < buyerCount; i++) {
        const buyTx = await Mina.transaction(
            {
                sender: pubKeys[i],
                fee: 1e9,
            },
            async () => {
                AccountUpdate.fundNewAccount(pubKeys[i]);
                await GameTokenInstance.mintGameToken(pubKeys[i]);
            }
        );
        await buyTx.prove();
        const pendingTx = await buyTx.sign([privKeys[i]]).send();
        console.log(`Game bought: https://minascan.io/devnet/tx/${pendingTx.hash}`);
        pendingTransactions.push(
            pendingTx.wait().then(async () => {
                await fetchAccount({
                    publicKey: pubKeys[i],
                    tokenId: TokenId.derive(GameTokenAddr),
                });
                console.log(
                    `buyer ${i} game token balance: ${Mina.getBalance(
                        pubKeys[i],
                        TokenId.derive(GameTokenAddr)
                    ).toString()}`
                );
            })
        );
    }
    await Promise.all(pendingTransactions);
};

const deviceRegistrations = async () => {
    const pendingTransactions = [];
    await fetchAccount({
        publicKey: DRMAddr,
    });
    for (let i = 0; i < buyerCount; i++) {
        await fetchAccount({
            publicKey: pubKeys[i],
            tokenId: TokenId.derive(GameTokenAddr),
        });
        await fetchAccount({
            publicKey: pubKeys[i],
        });

        const registerTx = await Mina.transaction(
            {
                sender: pubKeys[i],
                fee: 1e9,
            },
            async () => {
                await DRMInstance.initAndAddDevice(
                    pubKeys[i],
                    deviceSessionProofs[i],
                    UInt64.from(1)
                );
            }
        );
        await registerTx.prove();
        const pendingTx = await registerTx.sign([privKeys[i]]).send();
        console.log(`Device registered: https://minascan.io/devnet/tx/${pendingTx.hash}`);
        pendingTransactions.push(
            pendingTx.wait().then(async () => {
                console.log(`Device ${i} registered`);
            })
        );
    }
    await Promise.all(pendingTransactions);
};

const deviceRegistrationsOneByOne = async () => {
    await fetchAccount({
        publicKey: DRMAddr,
    });
    for (let i = 0; i < buyerCount; i++) {
        await fetchAccount({
            publicKey: pubKeys[i],
            tokenId: TokenId.derive(GameTokenAddr),
        });
        await fetchAccount({
            publicKey: pubKeys[i],
        });

        const registerTx = await Mina.transaction(
            {
                sender: pubKeys[i],
                fee: 1e9,
            },
            async () => {
                await DRMInstance.initAndAddDevice(
                    pubKeys[i],
                    deviceSessionProofs[i],
                    UInt64.from(1)
                );
            }
        );
        await registerTx.prove();
        const pendingTx = await registerTx.sign([privKeys[i]]).send();
        console.log(`Device registered: https://minascan.io/devnet/tx/${pendingTx.hash}`);
        await pendingTx.wait();
        console.log(`Device ${i} registered`);
    }
};

const settle = async () => {
    console.time("settlement proof");
    await fetchAccount({
        publicKey: DRMAddr,
    });
    const proof = await DRMInstance.offchainState.createSettlementProof();
    console.timeEnd("settlement proof");

    const settleTx = await Mina.transaction(
        {
            sender: pubKeys[0],
            fee: 1e9,
        },
        async () => {
            await DRMInstance.settle(proof);
        }
    );
    await settleTx.prove();
    const pendingTx = await settleTx.sign([privKeys[0]]).send();
    console.log(`Settlement sent: https://minascan.io/devnet/tx/${pendingTx.hash}`);
    await pendingTx.wait();
    console.log("Settlement complete");
};

const checkDevices = async () => {
    await fetchAccount({
        publicKey: DRMAddr,
    });
    for (let i = 0; i < buyerCount; i++) {
        const device = (
            await DRMInstance.offchainState.fields.devices.get(pubKeys[i])
        ).value.device_1.toString();
        console.log(`buyer ${i} device slot 1: ${device}`);
        console.log(`buyer ${i} actual device: ${deviceIdentifiers[i].hash().toString()}`);
    }
};

const sessionProofs: DeviceSessionProof[] = [];
const createSessions = async () => {
    for (let i = 0; i < buyerCount; i++) {
        console.time(`Session for device ${i}`);
        const pubInput = new DeviceSessionInput({
            gameToken: GameTokenAddr,
            currentSessionKey: UInt64.from(1),
            newSessionKey: UInt64.from(20),
        });

        const sessionProof = await DeviceSession.proofForSession(pubInput, deviceIdentifiers[i]);
        sessionProofs.push(sessionProof);
        console.timeEnd(`Session for device ${i}`);
        console.log(
            `${sessionProof.publicOutput.gameToken.toBase58()}, ${sessionProof.publicOutput.currentSessionKey.toString()}, ${sessionProof.publicOutput.newSessionKey.toString()}`
        );
    }
};

const submitSessions = async () => {
    for (let i = 0; i < buyerCount; i++) {
        const res = await axios.post("http://localhost:3333/submit-session", {
            proof: JSON.stringify(sessionProofs[i].toJSON()),
        });
        if (res.status === 200) {
            console.log(`Session ${i} submitted`);
        } else {
            console.error(`Session ${i} failed`);
        }
    }
};

const main = async () => {
    await initializeContracts();
    // await buyGames();
    // await createDeviceIdentifierProofs();
    // await deviceRegistrationsOneByOne();
    // await settle();
    await checkDevices();
    await createSessions();
    await submitSessions();
};

main();
