import { Account, fetchAccount, Mina, PublicKey } from "o1js";
import { Game } from "../db/schemas.js";
import logger from "../logger.js";

function accountToPrice(account: Account) {
    const fieldsArray = account?.zkapp?.appState;
    if (fieldsArray === undefined) {
        return null;
    }
    return {
        price: Number(fieldsArray[2].toBigInt()) / 1000000000,
        discount: Number(fieldsArray[3].toBigInt()) / 1000000000,
    };
}

export async function updateGamePrices() {
    logger.info("Updating game prices at " + new Date().toISOString());
    const games = await Game.find({}).exec();
    for (const game of games) {
        if (!game.gameTokenContractAddress) {
            continue;
        }
        const onChainPrice = await fetchAccount({
            publicKey: PublicKey.fromBase58(game.gameTokenContractAddress),
        }).then((account) => {
            if (!account.account) {
                return null;
            }
            return accountToPrice(account.account);
        });
        if (!onChainPrice) {
            continue;
        }
        if (game.price === onChainPrice.price && game.discount === onChainPrice.discount) {
            continue;
        }
        game.price = onChainPrice.price;
        game.discount = onChainPrice.discount;
        await game.save();
        console.log(
            `Updated price for ${game.name} to price: ${game.price}, discount: ${game.discount}`
        );
    }

    setTimeout(updateGamePrices, 1000 * 60 * 4); // 4 minutes
}

export function startGamePriceUpdater() {
    const minaEndpoint = process.env.MINA_ENDPOINT!;
    const archiveEndpoint = process.env.ARCHIVE_ENDPOINT!;
    const Network = Mina.Network({
        mina: minaEndpoint,
        archive: archiveEndpoint,
    });
    Mina.setActiveInstance(Network);
    updateGamePrices();
}
