import { UserDocument } from "./db/schemas";

declare global {
    namespace Express {
        interface Request {
            user?: UserDocument;
        }
    }
}
