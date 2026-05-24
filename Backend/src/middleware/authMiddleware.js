const jwt = require("jsonwebtoken");

const User = require("../models/User");

const protect = async (req, res, next) => {

    let token;

    // Check Authorization Header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {

        try {

            // Extract Token
            token =
                req.headers.authorization.split(" ")[1];

            // Verify Token
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            // Attach User To Request
            req.user = await User.findById(
                decoded.id
            ).select("-password");

            if (!req.user) {
                return res.status(401).json({
                    message: "User session is no longer valid"
                });
            }

            next();

        } catch (error) {

            return res.status(401).json({
                message: "Not authorized"
            });
        }
    }

    // No Token Found
    if (!token) {

        return res.status(401).json({
            message: "No token found"
        });
    }
};

module.exports = {
    protect
};
