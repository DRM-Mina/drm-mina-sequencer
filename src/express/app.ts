import express from "express";
import cors from "cors";
import helmet from "helmet";
import serveStatic from "serve-static";
import logger from "./logger.js";
import { connectToDatabase } from "./db/connection.js";

import authRoutes from "./routes/auth.js";
import commentsRoutes from "./routes/comments.js";
import gameDataRoutes from "./routes/gameData.js";
import wishlistRoutes from "./routes/wishlist.js";
import slotNamesRoutes from "./routes/slotNames.js";
import signedUrlRoutes from "./routes/signedUrl.js";
import sessionRoutes from "./routes/session.js";
import { envCheck } from "./utils/envCheck.js";
import { commonLimiter } from "./middlewares/rateLimiter.js";

envCheck();

const app = express();
const port = 3333;

app.use(cors());
app.use(express.json());
app.use(serveStatic("public"));
app.use(helmet());
app.use(commonLimiter);

app.use("/auth", authRoutes);
app.use("/comments", commentsRoutes);
app.use("/game-data", gameDataRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/slot-names", slotNamesRoutes);
app.use("/get-signed-url", signedUrlRoutes);
app.use("/submit-session", sessionRoutes);

try {
    await connectToDatabase();
    app.listen(port, () => {
        logger.info(`Server running on http://localhost:${port}`);
    });
} catch (err) {
    logger.error("Failed to connect to the database:", err);
    process.exit(1);
}
