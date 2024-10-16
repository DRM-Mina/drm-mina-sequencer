import express from "express";
import {
    checkEnv,
    compileContracts,
    fetchGamesFromDB,
    GameContracts,
    initializeContracts,
    initializeMinaInstance,
    updateGamePrices,
} from "./utils.js";
import { connectToDatabase } from "./db/connection.js";
import logger from "./logger.js";
import { Mina, PrivateKey, VerificationKey, verify } from "o1js";
import { DeviceSessionProof } from "drm-mina-contracts/build/src/lib/DeviceSessionProof.js";

let gameContracts: GameContracts[] = [];
let verificationKey: VerificationKey | undefined;

const feePayerPrivKeyString = checkEnv(process.env.FEE_PAYER_KEY, "MISSING FEE_PAYER_KEY");

const feePayerPrivKey = PrivateKey.fromBase58(feePayerPrivKeyString);

const feePayerPubKey = feePayerPrivKey.toPublicKey();

const port = 3334;

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
    try {
        const { proof } = req.body;
        if (!proof) {
            return res.status(400).send("Invalid request");
        }

        if (!verificationKey) {
            return res.status(500).send("Verification key not initialized");
        }

        const sessionProof = await DeviceSessionProof.fromJSON(JSON.parse(proof));
        const ok = await verify(sessionProof, verificationKey);
        if (!ok) {
            return res.status(400).send("Invalid proof");
        }

        console.log(ok);

        const game = gameContracts.find((g) => {
            console.log(g.gameTokenAddress, sessionProof.publicOutput.gameToken.toBase58());
            console.log(g.gameTokenAddress === sessionProof.publicOutput.gameToken.toBase58());
            return g.gameTokenAddress === sessionProof.publicOutput.gameToken.toBase58();
        });

        console.log(game);
        if (!game) {
            return res.status(400).send("Game not found");
        }

        console.time("createSession tx");
        const tx = await Mina.transaction(
            {
                sender: feePayerPubKey,
                fee: 1e8,
            },
            async () => {
                await game!.drm.createSession(sessionProof);
            }
        );
        console.timeEnd("createSession tx");

        tx.sign([feePayerPrivKey]);
        await tx.prove();
        let pendingTransaction = await tx.send();

        logger.info(`Transaction sent https://minascan.io/devnet/tx/${pendingTransaction.hash}`);

        res.status(200).send("OK");
    } catch (err) {
        logger.error("Failed to process request:", err);
        res.status(500).send("Internal server error");
    }
});

try {
    await connectToDatabase();
    initializeMinaInstance();
    verificationKey = await compileContracts();
    const gameData = await fetchGamesFromDB();
    await initializeContracts(gameData, gameContracts);
    await updateGamePrices(gameContracts);
    app.listen(port, () => {
        logger.info(`Server running on http://localhost:${port}`);
    });
} catch (err) {
    logger.error("Failed to start sequencer:", err);
    process.exit(1);
}
