const games = [
    {
        gameId: 1,
        name: "Warrior: The Diamond Forest",
        description:
            "Embark on an epic adventure in 'Warrior: The Diamond Forest,' a thrilling pixelated action game that takes you deep into the heart of a mysterious and dark forest. You play as a brave warrior equipped with a sharp blade and a sturdy shield, facing off against menacing creatures that lurk in the shadows.",
        creator: "Eren Kardas",
        imageFolder: "diamond",
        imageCount: 3,
        gameTokenContractAddress: "B62qqhNYa8zdCnNMZqtPcgrUV72342LPF58sM5tHVRsnLtowNMjwxnW",
        DRMContractAddress: "B62qrCgG8CcQJiTDj2DoaWTpUCo6Tm6VECFRdSoXVD2TbctHL5jjgbX",
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
        gameTokenContractAddress: "B62qoPeVuNurBLbrdEvyjLbTE7odRq3fKE2ZpUfALn1xnXtt5cQxZgV",
        DRMContractAddress: "B62qnijB6HtyDRHcYM3pZ1ZAUd2kFpT33acbUpCcRGygHVtVCADGiiG",
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
        gameTokenContractAddress: "B62qnddkpwSvKLNcpUUchdW1AemQ72DTNaxyiUE9TKqEJcoQpM2fDrM",
        DRMContractAddress: "B62qjDofX5d8Z8Lp7HKZjT7yDgRXH2aDMK76n2orUSFJat6umgZyUMS",
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
