const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});
const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const uploadRoutes = require("./routes/uploadRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes.js");
const dashboardRoutes = require("./routes/dashboardRoutes.js");
const authRoutes = require("./routes/authRoutes.js");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.send("Backend Running Successfully");
});

app.use("/upload", uploadRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
