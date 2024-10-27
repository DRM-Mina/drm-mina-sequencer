import express, { Router } from "express";
import { Comment, Game } from "../db/schemas.js";
import logger from "../logger.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";

const router: Router = express.Router();

router.get("/:gameId", async (req, res) => {
    const { gameId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (gameId === undefined) {
        logger.error("Game ID not provided");
        return res.status(400).send({ message: "Game ID not provided" });
    }

    if (page < 1 || limit < 1 || limit > 100) {
        logger.error("Invalid page or limit");
        return res.status(400).send({ message: "Invalid page or limit" });
    }

    try {
        const totalComments = await Comment.countDocuments({ game: gameId });
        const totalPages = Math.ceil(totalComments / limit);

        const comments = await Comment.find({ game: gameId })
            .populate("user", "publicKey")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        logger.info("Comments fetched for game " + gameId);
        res.status(200).json({
            comments,
            totalComments,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: "Error fetching comments" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    const { content, rating, gameId } = req.body;
    const userId = req.user!._id;

    if (content === undefined || rating === undefined || gameId === undefined) {
        logger.error(`Missing required fields ${content} ${rating} ${gameId}`);
        res.status(400).send({ message: "Missing required fields" });
        return;
    }

    if (rating < 1 || rating > 5) {
        logger.error("Rating must be between 1 and 5");
        res.status(400).send({ message: "Rating must be between 1 and 5" });
        return;
    }

    try {
        const game = await Game.findOne({ gameId });

        if (!game) {
            logger.error("Game not found");
            res.status(404).send({ message: "Game not found" });
            return;
        }

        const userComment = await Comment.findOne({ user: userId, game: gameId });

        if (userComment) {
            logger.error(`User ${userId} has already commented on this game`);
            res.status(400).send({ message: "You have already commented on this game" });
            return;
        }

        const newComment = new Comment({
            content,
            rating,
            user: userId,
            game: gameId,
        });

        await newComment.save();

        const averageRatingResult = await Comment.aggregate([
            { $match: { game: Number(gameId) } },
            { $group: { _id: null, averageRating: { $avg: "$rating" } } },
        ]);

        const averageRating =
            averageRatingResult.length > 0 ? averageRatingResult[0].averageRating : 0;

        const ratingCount = await Comment.countDocuments({ game: gameId });

        game.averageRating = averageRating;
        game.ratingCount = ratingCount;
        await game.save();

        logger.info("Comment added");
        res.status(201).json({ message: "Comment added", comment: newComment });
    } catch (error) {
        logger.error(error);
        res.status(500).send({ message: "Error saving comment" });
    }
});

router.put("/:commentId", authenticateToken, async (req, res) => {
    const { content, rating } = req.body;
    const { commentId } = req.params;
    const userId = req.user!._id;

    if (content === undefined || rating === undefined) {
        logger.error("Missing required fields");
        return res.status(400).send({ message: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
        logger.error("Rating must be between 1 and 5");
        return res.status(400).send({ message: "Rating must be between 1 and 5" });
    }

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            logger.error("Comment not found");
            return res.status(404).send({ message: "Comment not found" });
        }

        if (!comment.user.equals(userId)) {
            logger.error("User is not allowed to update this comment");
            return res.status(403).send({ message: "You are not allowed to update this comment" });
        }

        comment.content = content;
        comment.rating = rating;

        await comment.save();

        const gameId = comment.game;
        const game = await Game.findOne({ gameId });
        if (game) {
            const averageRatingResult = await Comment.aggregate([
                { $match: { game: Number(gameId) } },
                { $group: { _id: null, averageRating: { $avg: "$rating" } } },
            ]);

            const averageRating =
                averageRatingResult.length > 0 ? averageRatingResult[0].averageRating : 0;

            const ratingCount = await Comment.countDocuments({ game: gameId });
            game.averageRating = averageRating;
            game.ratingCount = ratingCount;
            await game.save();
        }

        logger.info(`Comment ${commentId} updated`);
        res.status(200).json({ message: "Comment updated", comment });
    } catch (error) {
        logger.error(error);
        res.status(500).send({ message: "Error updating comment" });
    }
});

router.delete("/:commentId", authenticateToken, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user!._id;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            logger.error("Comment not found");
            return res.status(404).send({ message: "Comment not found" });
        }

        if (!comment.user.equals(userId)) {
            logger.error("User is not allowed to delete this comment");
            return res.status(403).send({ message: "You are not allowed to delete this comment" });
        }

        await Comment.findByIdAndDelete(commentId);

        const gameId = comment.game;
        const game = await Game.findOne({ gameId });
        if (game) {
            const averageRatingResult = await Comment.aggregate([
                { $match: { game: Number(gameId) } },
                { $group: { _id: null, averageRating: { $avg: "$rating" } } },
            ]);

            const averageRating =
                averageRatingResult.length > 0 ? averageRatingResult[0].averageRating : 0;

            const ratingCount = await Comment.countDocuments({ game: gameId });

            game.averageRating = averageRating;
            game.ratingCount = ratingCount;
            await game.save();
        }

        logger.info(`Comment ${commentId} deleted`);
        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        logger.error(error);
        res.status(500).send({ message: "Error deleting comment" });
    }
});
export default router;
