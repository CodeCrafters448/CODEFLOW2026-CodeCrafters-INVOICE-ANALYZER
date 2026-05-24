const express = require("express");

const {
    uploadInvoice,
    getInvoices,
    getLatestInvoice,
    getInvoiceById
} = require("../controllers/invoiceController.js");

const {
    protect
} = require("../middleware/authMiddleware.js");

const {
    upload
} = require("../middleware/uploadMiddleware.js");

const router = express.Router();

router.post(
    "/upload",
    protect,
    upload.single("invoice"),
    uploadInvoice
);

router.get(
    "/latest",
    protect,
    getLatestInvoice
);

router.get(
    "/:id",
    protect,
    getInvoiceById
);

router.get(
    "/",
    protect,
    getInvoices
);

module.exports = router;
