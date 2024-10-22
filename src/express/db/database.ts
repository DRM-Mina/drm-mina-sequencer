const games = [
    {
        gameId: 1,
        name: "Warrior: The Diamond Forest",
        description:
            "Embark on an epic adventure in 'Warrior: The Diamond Forest,' a thrilling pixelated action game that takes you deep into the heart of a mysterious and dark forest. You play as a brave warrior equipped with a sharp blade and a sturdy shield, facing off against menacing creatures that lurk in the shadows.",
        creator: "Eren Kardas",
        imageFolder: "diamond",
        imageCount: 3,
        gameTokenContractAddress: "B62qnTosnQXoBADrYjUX594EMaDX1sjG2BXAc2aPVL7STL71VXDTBMv",
        DRMContractAddress: "B62qnDL7ysxQcsiNT3Av6PR6QhJXTsygSQ7jing5MwynpTbS9bWKiGe",
        price: 10,
        discount: 2,
        tags: ["Action", "Adventure", "Survival"],
        downloadable: true,
    },
    {
        gameId: 2,
        name: "KindaSus",
        description:
            "As the captain of this high-tech spaceship, your mission is to navigate through the cosmos, using your ship's mechanical arms to grab and collect the floating imposters. Each character you collect brings you closer to completing your mission, but be prepared for challenges along the way.",
        creator: "Shap Shup Games",
        imageFolder: "kindasus",
        imageCount: 3,
        gameTokenContractAddress: "B62qkm95Vfsg6NY9tM61tZiahQPzYz51hiT9UdZzxRXMPrLEs7uQZEt",
        DRMContractAddress: "B62qjuLbmc5L5c99KMCWpzYJuLfJazenu6EJqKUQPe1U3hdxDmhxx7w",
        price: 20,
        discount: 10,
        tags: ["Simulation", "Puzzle"],
        downloadable: true,
    },
    {
        gameId: 3,
        name: "Barbarian",
        description:
            "Barbarian is a single-player action-adventure game where you play as a barbarian warrior.",
        creator: "Eren Kardas",
        imageFolder: "barbarian",
        imageCount: 0,
        gameTokenContractAddress: "B62qkifgzRPVYaD5BpqP8Lyi2JPMxAFZKEJtX2n5BPLQAQR8upkbQjM",
        DRMContractAddress: "B62qmAzQSf72LujwkB4xJbnfy3RiQXfF65czYEwtyx2eNJzq3zJsqxn",
        price: 15,
        discount: 5,
        tags: ["Action", "Adventure", "RPG"],
        downloadable: false,
    },
];

export interface Game {
    gameId: number;
    name: string;
    description: string;
    creator: string;
    imageFolder: string;
    imageCount: number;
    gameTokenContractAddress: string;
    DRMContractAddress: string;
    price: number;
    discount: number;
    tags: string[];
    downloadable: boolean;
}

class Database {
    games: Game[];
    constructor() {
        this.games = games;
    }
}

export default Database;
