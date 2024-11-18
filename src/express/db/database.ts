const games = [
    {
        gameId: 1,
        name: "Warrior: The Diamond Forest",
        description:
            "Embark on an epic adventure in 'Warrior: The Diamond Forest,' a thrilling pixelated action game that takes you deep into the heart of a mysterious and dark forest. You play as a brave warrior equipped with a sharp blade and a sturdy shield, facing off against menacing creatures that lurk in the shadows.",
        creator: "Eren Kardas",
        imageFolder: "diamond",
        imageCount: 3,
        gameTokenContractAddress: "B62qrhSFNCiLhxwvGeVE4H9eiHYGzbdz6x98rJW3pMfNAdWd8XJb9rv",
        DRMContractAddress: "B62qkBz8sKUr48HbnUeVt9WvpUJ6tyK4YmuUsAxTMdQ7Lo9bX8iw364",
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
        gameTokenContractAddress: "B62qk9CzzR2FyxmZDuSQ7KdvGexPZwwd8K3RccwJZwrSmvnBSsJCYwe",
        DRMContractAddress: "B62qjubSRcRR2FHN1AMuTy2nAvmAUfof6L6EovgixmoE7DykvZYzz6B",
        price: 20,
        discount: 10,
        tags: ["Simulation", "Puzzle"],
        downloadable: true,
    },
    {
        gameId: 3,
        name: "DRM Demo",
        description: "This is a demo game that showcases the capabilities of the DRM system.",
        creator: "DRM Mina",
        imageFolder: "default",
        imageCount: 0,
        gameTokenContractAddress: "B62qitxXzCSz5KdzPGhKANhiGepdqNSuE7dMhD77RCiEKJfgn2oFwSu",
        DRMContractAddress: "B62qmSFqFLF8wbpGQYriJn13AwDDsCqPrSkbAJz5ZAHknAzDGgRFyMG",
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
