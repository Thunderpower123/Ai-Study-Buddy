import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
    if (req.method === "OPTIONS") return next();

    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return next(); // let route decide

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    req.user = user;
    next();
});

export { verifyJWT };
