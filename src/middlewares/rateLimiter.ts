import rateLimit from "express-rate-limit";

export const getSignedUrlLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const commonLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: {
        message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
