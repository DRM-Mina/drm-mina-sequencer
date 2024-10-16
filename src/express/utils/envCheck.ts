export async function envCheck() {
    const env = process.env.NODE_ENV || "development";
    if (env === "development") {
        console.log("Running in development mode");
    } else if (env === "production") {
        console.log("Running in production mode");
    } else {
        throw new Error("Invalid NODE_ENV");
    }

    if (!process.env.MONGO) {
        throw new Error("MONGO environment variable is not defined");
    }

    if (!process.env.MONGODB_PASSWRD) {
        throw new Error("MONGODB_PASSWRD environment variable is not defined");
    }

    if (!process.env.CF_ENDPOINT) {
        throw new Error("CF_ENDPOINT environment variable is not defined");
    }

    if (!process.env.CF_ACCESS_KEY_ID) {
        throw new Error("CF_ACCESS_KEY_ID environment variable is not defined");
    }

    if (!process.env.CF_SECRET_ACCESS_KEY) {
        throw new Error("CF_SECRET_ACCESS_KEY environment variable is not defined");
    }

    if (!process.env.CF_BUCKET) {
        throw new Error("CF_BUCKET environment variable is not defined");
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is not defined");
    }

    if (!process.env.MINA_ENDPOINT) {
        throw new Error("MINA_ENDPOINT environment variable is not defined");
    }

    if (!process.env.ARCHIVE_ENDPOINT) {
        throw new Error("ARCHIVE_ENDPOINT environment variable is not defined");
    }

    if (!process.env.FEE_PAYER_KEY) {
        throw new Error("FEE_PAYER_KEY environment variable is not defined");
    }
}
