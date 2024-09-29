import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../logger";

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).send({ message: "No token provided" });

    if (!process.env.JWT_SECRET) {
        logger.error("JWT_SECRET environment variable is not defined");
        return res.status(500).send({ message: "Internal server error" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.error(err);
            return res.status(403).send({ message: "Invalid token" });
        }
        // req.user = user;
        next();
    });
}
