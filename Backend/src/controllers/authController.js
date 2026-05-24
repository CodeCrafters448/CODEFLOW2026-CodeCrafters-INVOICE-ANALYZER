const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

const registerUser = async (req, res) => {

    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({
            message: "User already exists"
        });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        password: hashedPassword
    });

    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        token: generateToken(user._id)
    });
};

const loginUser = async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            token: generateToken(user._id)
        });

    } else {

        res.status(401).json({
            message: "Invalid credentials"
        });
    }
};

const updateProfile = async (req, res) => {

    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            message: "Name is required"
        });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    user.name = name.trim();

    const updatedUser = await user.save();

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt
    });
};

const changePassword = async (req, res) => {

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            message: "Current and new passwords are required"
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            message: "New password must be at least 6 characters"
        });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    const passwordMatches = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Current password is incorrect"
        });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({
        message: "Password changed successfully"
    });
};

module.exports = {
    registerUser,
    loginUser,
    updateProfile,
    changePassword
};
