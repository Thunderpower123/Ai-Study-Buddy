import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
};

// 🔧 helper
const generateTokens = async (userId) => {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

// ---------------- REGISTER ----------------
export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, age, password } = req.body;

    if (!name || !email || !password || age === undefined) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (age < 10) {
        return res.status(400).json({
            success: false,
            message: "Age must be at least 10"
        });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email already registered"
        });
    }

    const user = await User.create({
        name,
        email,
        age,
        password,
        provider: "local"
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: createdUser
    });
});

// ---------------- LOGIN ----------------
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.provider !== "local") {
        return res.status(400).json({
            success: false,
            message: "Please login using Google"
        });
    }

    const isMatch = await user.isPasswordCorrect(password);

    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const { accessToken, refreshToken } = await generateTokens(user._id);

    res
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .status(200)
        .json({
            success: true,
            message: "Login successful",
            user: await User.findById(user._id).select("-password -refreshToken")
        });
});

// ---------------- LOGOUT ----------------
export const logoutUser = asyncHandler(async (req, res) => {
    if (req.user?._id) {
        await User.findByIdAndUpdate(req.user._id, {
            $unset: { refreshToken: 1 }
        });
    }

    res
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .status(200)
        .json({
            success: true,
            message: "Logged out successfully"
        });
});

// ---------------- REFRESH ----------------
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingToken) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const decoded = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== incomingToken) {
        return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    res
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .status(200)
        .json({
            success: true,
            message: "Token refreshed"
        });
});

// ---------------- CURRENT USER ----------------
export const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
});

// ---------------- GOOGLE LOGIN ----------------
export const googleLogin = asyncHandler(async (req, res) => {
    const { idToken } = req.body;

    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture, email_verified } = payload;

    if (!email_verified) {
        return res.status(400).json({
            success: false,
            message: "Google email not verified"
        });
    }

    let user = await User.findOne({
        $or: [{ googleId: sub }, { email }]
    });

    if (!user) {
        user = await User.create({
            name,
            email,
            googleId: sub,
            avatar: picture,
            provider: "google"
        });
    } else if (!user.googleId) {
        user.googleId = sub;
        user.provider = "google";
        await user.save({ validateBeforeSave: false });
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    res
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .status(200)
        .json({
            success: true,
            message: "Google login successful",
            user: await User.findById(user._id).select("-password -refreshToken")
        });
});