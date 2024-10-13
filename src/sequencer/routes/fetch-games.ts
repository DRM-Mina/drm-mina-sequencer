import express, { Router } from "express";

const router: Router = express.Router();

router.get("fetch-games", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
    } catch (err) {
        res.status(500).send({ message: "Error retrieving game data" });
    }
});

export default router;
