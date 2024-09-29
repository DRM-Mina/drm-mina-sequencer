import express from "express";
import cors from "cors";
import helmet from "helmet";
import serveStatic from "serve-static";
import logger from "./logger";
import { connectToDatabase } from "./db/connection";

import authRoutes from "./routes/auth";
import gameDataRoutes from "./routes/gameData";
import wishlistRoutes from "./routes/wishlist";
import slotNamesRoutes from "./routes/slotNames";
import signedUrlRoutes from "./routes/signedUrl";
import sessionRoutes from "./routes/session";
import { envCheck } from "./utils/envCheck";

envCheck();

const app = express();
const port = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(serveStatic("public"));
app.use(helmet());

app.use("/auth", authRoutes);
app.use("/game-data", gameDataRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/slot-names", slotNamesRoutes);
app.use("/get-signed-url", signedUrlRoutes);
app.use("/submit-session", sessionRoutes);

app.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}`);
    connectToDatabase();
});
