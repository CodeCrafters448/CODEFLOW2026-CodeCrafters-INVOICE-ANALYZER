const Invoice = require("../models/Invoice");

const {
    extractTextFromImage
} = require("../services/ocrService");

const {
    categorizeExpense
} = require("../services/aiCategorizer");

const {
    generateInsights
} = require("../services/insightsService");


// Upload Invoice
const uploadInvoice = async (req, res) => {

    try {

        const filePath = req.file.path;

        // OCR Extraction
        const text = await extractTextFromImage(filePath);

        // Merchant Detection
        const merchantName =
            text.split("\n")[0] || "Unknown Merchant";

        // Amount Detection
        const amountMatch =
            text.match(/\d+[.]\d{2}/);

        const amount =
            amountMatch
                ? Number(amountMatch[0])
                : 0;

        // Tax Calculation
        const tax = amount * 0.18;

        // Extract Few Items
        const items =
            text.split("\n").slice(1, 5);

        // AI Categorization
        const category =
            categorizeExpense(
                merchantName,
                items
            );

        // Invoice Object
        const invoiceData = {

            user: req.user._id,

            merchantName,

            amount,

            tax,

            date: new Date(),

            category,

            items,

            rawText: text
        };

        // AI Insights
        invoiceData.insights =
            generateInsights(invoiceData);

        // Save To MongoDB
        const invoice =
            await Invoice.create(invoiceData);

        res.status(201).json(invoice);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Invoice processing failed"
        });
    }
};


// Get All Invoices
const getInvoices = async (req, res) => {

    try {

        const invoices = await Invoice.find({
            user: req.user._id
        });

        res.json(invoices);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch invoices"
        });
    }
};


module.exports = {
    uploadInvoice,
    getInvoices
};
