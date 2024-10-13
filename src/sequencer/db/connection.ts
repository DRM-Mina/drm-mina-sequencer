import mongoose from "mongoose";
import logger from "../logger.js";

// export function connectToDatabase() {
//     mongoose.connect(process.env.MONGO as string);
//     const db = mongoose.connection;

//     db.on("error", (err) => {
//         logger.error("MongoDB connection error:", err);
//         throw new Error("MongoDB connection error");
//     });

//     db.once("open", () => {
//         logger.info("Connected successfully to MongoDB");
//     });
// }

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
