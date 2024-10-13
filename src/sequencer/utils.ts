import { DRM } from "drm-mina-contracts/build/src/DRM.js";
import { GameToken } from "drm-mina-contracts/build/src/GameToken.js";

export interface GameData {
    gameIndex: number;
    gameTokenAddress: string;
    drmAddress: string;
}

export interface GameContracts {
    gameTokenAddress: string;
    gameToken: GameToken;
    drmAddress: string;
    drm: DRM;
}
