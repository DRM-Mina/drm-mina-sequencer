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
import fs from "fs/promises";

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

let deviceIdentifierProofs: DeviceIdentifierProof[] = [];
const createDeviceIdentifierProofs = async () => {
    let isDeviceIdentifierProofsExist = false;
    let deviceIdentifierProofArr = [];
    try {
        const deviceIdentifierProofsJson = await fs.readFile(
            "./cachedProofs/deviceIdentifierProofs.json"
        );
        console.log("deviceIdentifierProofsJson read");
        deviceIdentifierProofArr = JSON.parse(deviceIdentifierProofsJson.toString());
        console.log("deviceIdentifierProofArr parsed, length:", deviceIdentifierProofArr.length);
        if (deviceIdentifierProofArr.length === buyerCount) {
            isDeviceIdentifierProofsExist = true;
        }
    } catch (e) {
        isDeviceIdentifierProofsExist = false;
    }
    if (!isDeviceIdentifierProofsExist) {
        for (let i = 0; i < buyerCount; i++) {
            console.time(`Proof for device ${i}`);
            const deviceIdentifierProof = await DeviceIdentifier.proofForDevice(
                deviceIdentifiers[i]
            );
            deviceIdentifierProofs.push(deviceIdentifierProof.proof);
            console.timeEnd(`Proof for device ${i}`);
        }
        await fs.writeFile(
            "./cachedProofs/deviceIdentifierProofs.json",
            JSON.stringify(deviceIdentifierProofs, null, 2)
        );
    } else {
        for (let i = 0; i < buyerCount; i++) {
            const deviceIdentifierProof = await DeviceIdentifierProof.fromJSON(
                deviceIdentifierProofArr[i]
            );
            deviceIdentifierProofs.push(deviceIdentifierProof);
        }
    }
};

const fetchGameToken = async (i: number) => {
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
};

const buyGames = async () => {
    const pendingTransactions = [];
    for (let i = 0; i < buyerCount; i++) {
        await fetchGameToken(i);
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
                await fetchGameToken(i);
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
                    deviceIdentifierProofs[i],
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
    for (let i = 4; i < buyerCount; i++) {
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
                    deviceIdentifierProofs[i],
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

const deviceChangeOneByOne = async () => {
    await fetchAccount({
        publicKey: DRMAddr,
    });
    for (let i = 4; i < buyerCount; i++) {
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
                await DRMInstance.changeDevice(
                    pubKeys[i],
                    deviceIdentifierProofs[i],
                    UInt64.from(2)
                );
            }
        );
        await registerTx.prove();
        const pendingTx = await registerTx.sign([privKeys[i]]).send();
        console.log(`Device changed: https://minascan.io/devnet/tx/${pendingTx.hash}`);
        await pendingTx.wait();
        console.log(`Device ${i} changed`);
    }
};

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

const settle = async () => {
    console.time("settlement proof");
    await fetchAccount({
        publicKey: DRMAddr,
    });

    const actions = await fetchActions(DRMInstance);
    console.log(`actions: ${actions}`);
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

let sessionProofs: DeviceSessionProof[] = [];
const createSessions = async () => {
    let isSessionProofsExist = false;
    let sessionProofArr = [];
    try {
        const sessionProofsJson = await fs.readFile("./cachedProofs/sessionProofs.json");
        console.log("sessionProofsJson read");
        sessionProofArr = JSON.parse(sessionProofsJson.toString());
        console.log("sessionProofArr parsed, length:", sessionProofArr.length);
        if (sessionProofArr.length === buyerCount) {
            isSessionProofsExist = true;
        }
    } catch (e) {
        isSessionProofsExist = false;
    }

    if (!isSessionProofsExist) {
        for (let i = 0; i < buyerCount; i++) {
            console.time(`Session for device ${i}`);
            const pubInput = new DeviceSessionInput({
                gameToken: GameTokenAddr,
                currentSessionKey: UInt64.from(200),
                newSessionKey: UInt64.from(3131),
            });

            const sessionProof = await DeviceSession.proofForSession(
                pubInput,
                deviceIdentifiers[i]
            );
            sessionProofs.push(sessionProof.proof);
            console.timeEnd(`Session for device ${i}`);
        }
        await fs.writeFile(
            "./cachedProofs/sessionProofs.json",
            JSON.stringify(sessionProofs, null, 2)
        );
    } else {
        for (let i = 0; i < buyerCount; i++) {
            const sessionProof = await DeviceSessionProof.fromJSON(sessionProofArr[i]);
            sessionProofs.push(sessionProof);
        }
    }
};

const submitSessions = async () => {
    for (let i = 0; i < buyerCount; i++) {
        const res = await axios.post("http://api_drmmina.kadircan.org/submit-session", {
            proof: JSON.stringify(sessionProofs[i].toJSON()),
        });
        if (res.status === 200) {
            console.log(`Session ${i} submitted`);
        } else {
            console.error(`Session ${i} failed`);
        }
    }
};

const checkSessions = async () => {
    await fetchAccount({
        publicKey: DRMAddr,
    });
    for (let i = 0; i < buyerCount; i++) {
        const session = (
            await DRMInstance.offchainState.fields.sessions.get(deviceIdentifiers[i].hash())
        ).value.toString();
        console.log(`buyer ${i} session: ${session}`);
    }
};

const main = async () => {
    await initializeContracts();
    // await buyGames();
    await createDeviceIdentifierProofs();
    // await deviceRegistrationsOneByOne();
    // await settle();
    await checkSessions();
    // await checkDevices();
    await deviceChangeOneByOne();
    // await createSessions();
    // await submitSessions();
    // wait 6 minutes for the sessions to be processed
    // await new Promise((resolve) => setTimeout(resolve, 600000));
    // await settle();
    // await checkSessions();
};

main();
