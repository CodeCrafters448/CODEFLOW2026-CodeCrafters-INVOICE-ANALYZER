const express = require("express");

const {
    registerUser,
    loginUser,
    updateProfile,
    changePassword
} = require("../controllers/authController");

const {
    protect
} = require("../middleware/authMiddleware");

const router = express.Router();


// Register User
router.post(
    "/register",
    registerUser
);


// Login User
router.post(
    "/login",
    loginUser
);

router.put(
    "/profile",
    protect,
    updateProfile
);

router.put(
    "/password",
    protect,
    changePassword
);


module.exports = router;
