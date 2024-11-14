const games = [
    {
        gameId: 1,
        name: "Warrior: The Diamond Forest",
        description:
            "Embark on an epic adventure in 'Warrior: The Diamond Forest,' a thrilling pixelated action game that takes you deep into the heart of a mysterious and dark forest. You play as a brave warrior equipped with a sharp blade and a sturdy shield, facing off against menacing creatures that lurk in the shadows.",
        creator: "Eren Kardas",
        imageFolder: "diamond",
        imageCount: 3,
        gameTokenContractAddress: "B62qkQARE96RJsYZVhw4WrqK7wXBQ3Ph9h2M9tp9WxbowsbmKhY79Jj",
        DRMContractAddress: "B62qowDEqPh1dQ22ZRB3q4nhAww2jKf3pfLHjSvu4GqgvQMoFGCCR79",
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
        gameTokenContractAddress: "B62qk56oefVbvKqvV1Y3AZt3J5JqcKr5fb4Ns1GzKu384dg76cmoH3Q",
        DRMContractAddress: "B62qofaR2GfBqxdQmv9wptycVyVKf9A93oNofE4JHCashzyibYpkoHk",
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
        gameTokenContractAddress: "B62qnDAKeEUn5fnCF5w4AMSxXN65nSLNRhew12KAPkwe7MUKcGwqQkU",
        DRMContractAddress: "B62qrATvAo49ZpeuLNMhz7PAvonmBYnhQ1wxPoa2iHP4vev7UT13yzq",
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
