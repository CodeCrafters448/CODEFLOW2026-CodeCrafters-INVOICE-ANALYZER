require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const uploadRoutes = require("./routes/uploadRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend Running Successfully");
});

app.use("/upload", uploadRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


const invoiceRoutes = require("./routes/invoiceRoutes.js");
app.use("/api/invoice", invoiceRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes.js");
app.use("/api/dashboard", dashboardRoutes);

const authRoutes = require("./routes/authRoutes.js");
app.use("/api/auth", authRoutes);