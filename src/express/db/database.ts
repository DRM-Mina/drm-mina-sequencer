const games = [
    {
        id: 1,
        name: "Warrior: The Diamond Forest",
        description:
            "Embark on an epic adventure in 'Warrior: The Diamond Forest,' a thrilling pixelated action game that takes you deep into the heart of a mysterious and dark forest. You play as a brave warrior equipped with a sharp blade and a sturdy shield, facing off against menacing creatures that lurk in the shadows.",
        creator: "Eren Kardas",
        imageFolder: "diamond",
        imageCount: 3,
        gameTokenContractAddress: "B62qoLnHdRGnBQJTe8oZjwMr9vYgM859S2io4oELJDVgn5LTaAAWits",
        DRMContractAddress: "B62qn6sovFQ3XUdr98xv4Ex63sZncBSQDSZ7EBKpUGGdiiVCR8oJnpa",
        price: 10,
        discount: 2,
        tags: ["Action", "Adventure", "Survival"],
        downloadable: true,
    },
    {
        id: 2,
        name: "KindaSus",
        description:
            "As the captain of this high-tech spaceship, your mission is to navigate through the cosmos, using your ship's mechanical arms to grab and collect the floating imposters. Each character you collect brings you closer to completing your mission, but be prepared for challenges along the way.",
        creator: "Shap Shup Games",
        imageFolder: "kindasus",
        imageCount: 3,
        gameTokenContractAddress: "B62qmyQSLq5ehNqD6Fb8f1uyZHKPhBvQpKCPGYz7EDkZ2qgvtxXcGtG",
        DRMContractAddress: "B62qpLCezHwRw7jUBLhi17pqnQdszUsqNFAFrg7oiF4ENVjEeiAhdyM",
        price: 20,
        discount: 10,
        tags: ["Simulation", "Puzzle"],
        downloadable: true,
    },
    {
        id: 3,
        name: "Barbarian",
        description:
            "Barbarian is a single-player action-adventure game where you play as a barbarian warrior.",
        creator: "Eren Kardas",
        imageFolder: "barbarian",
        imageCount: 0,
        gameTokenContractAddress: "B62qrCwQ1ZhBjGgj5AyukZuU8XXLPBXWfCd3Njpg4YHGeF5rTmSqAN2",
        DRMContractAddress: "B62qnP51ecTTBFduuD1UApHDzkEXb4FWkL5rhnbrHEptBSvfum6nnJ3",
        price: 15,
        discount: 5,
        tags: ["Action", "Adventure", "RPG"],
        downloadable: false,
    },
];

export interface Game {
    id: number;
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
