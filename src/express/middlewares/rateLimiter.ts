import rateLimit from "express-rate-limit";

export const getSignedUrlLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50, // Todo - Change this after testing
    message: {
        message: "Too many requests",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const commonLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1000,
    message: {
        message: "Too many requests",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
