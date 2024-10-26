import mongoose from "mongoose";

const Schema = mongoose.Schema;

const gameSchema = new Schema(
    {
        gameId: { type: Number, index: true },
        name: String,
        description: String,
        creator: String,
        imageFolder: String,
        imageCount: Number,
        gameTokenContractAddress: String,
        DRMContractAddress: String,
        price: Number,
        discount: Number,
        tags: [String],
        downloadable: Boolean,
        averageRating: {
            type: Number,
            default: 0,
        },
        ratingCount: {
            type: Number,
            default: 0,
        },
    },
    { versionKey: false }
);

const UserSchema = new Schema(
    {
        publicKey: {
            type: String,
            unique: true,
            required: true,
        },
        wishlistedGames: [Number],
        slots: {
            type: Map,
            of: {
                slotNames: {
                    type: [String],
                    default: ["Slot 1", "Slot 2", "Slot 3", "Slot 4"],
                },
                slots: {
                    type: [String],
                    default: ["", "", "", ""],
                },
            },
            default: () => ({}),
        },
    },
    { versionKey: false }
);
const CommentSchema = new Schema(
    {
        content: { type: String, required: false },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        game: { type: Number, ref: "Game", required: true },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

export const User = mongoose.model("User", UserSchema);
export const Game = mongoose.model("Game", gameSchema);
export const Comment = mongoose.model("Comment", CommentSchema);

export interface UserDocument extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    publicKey: string;
}
