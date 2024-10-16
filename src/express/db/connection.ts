import mongoose from "mongoose";
import logger from "../logger.js";

export async function connectToDatabase() {
    try {
        if (!process.env.MONGO) {
            throw new Error("MongoDB connection string is not provided");
        }

        await mongoose.connect(process.env.MONGO);

        logger.info("Connected successfully to MongoDB");
    } catch (error) {
        logger.error("MongoDB connection error:", error);
        throw error;
    }
}
