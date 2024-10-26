import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../logger.js";
import { User } from "../db/schemas.js";

interface JwtPayloadWithPublicKey extends jwt.JwtPayload {
    publicKey: string;
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).send({ message: "No token provided" });

    if (!process.env.JWT_SECRET) {
        logger.error("JWT_SECRET environment variable is not defined");
        return res.status(500).send({ message: "Internal server error" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayloadWithPublicKey;
        const { publicKey } = decoded;

        const user = await User.findOne({ publicKey });

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        req.user = user;

        next();
    } catch (err) {
        logger.error(err);
        return res.status(403).send({ message: "Invalid token" });
    }
}
