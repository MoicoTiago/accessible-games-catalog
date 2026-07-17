import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

/**
 * Express middleware that validates a JWT bearer token, attaches `{ id, isAdmin }`
 * to `req.user`, and rejects requests with 401/403 when invalid or missing.
 * Requires `JWT_SECRET` to be set.
 */
export default async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // Load user to attach isAdmin flag (and guard against deleted users)
        const user = await User.findByPk(payload.id, { attributes: ['id', 'isAdmin'] });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = { id: user.id, isAdmin: !!user.isAdmin };
        next();
    } catch (e) {
        console.error("JWT verify failed:", e.message);
        return res.status(401).json({ message: "Invalid token" });
    }
}
