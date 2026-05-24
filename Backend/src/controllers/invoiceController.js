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


// ==========================
// HELPER FUNCTIONS
// ==========================

const getLines = (text = "") => {

    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
};


const getLineCurrencyAmount = (line = "") => {

    const currencyMatch =
        line.match(
            /(?:rs\.?|inr|₹)\s*(\d[\d,]*(?:\.\d{2})?)/i
        );

    if (currencyMatch) {

        return Number(
            currencyMatch[1].replace(/,/g, "")
        );
    }

    const numberMatches =
        line.match(/\d[\d,]*(?:\.\d{2})?/g) || [];

    return numberMatches.length
        ? Number(
            numberMatches[
                numberMatches.length - 1
            ].replace(/,/g, "")
        )
        : 0;
};


const isLikelyMerchantLine = (line = "") => {

    const normalized =
        line.replace(/[^a-z0-9]/gi, "");

    if (normalized.length < 3) {
        return false;
    }

    return !/^(invoice|bill|date|item|qty|quantity|price|amount|subtotal|total|gst|tax|thank)/i.test(
        normalized
    );
};


const cleanMerchantName = (line = "") => {

    return (
        line || "Unknown Merchant"
    )
        .split(
            /\b(?:invoice|date|item|qty|quantity|subtotal|total|gst|tax)\b/i
        )[0]
        .replace(/[|:]+$/g, "")
        .trim() || "Unknown Merchant";
};


const parseInvoiceDate = (dateText) => {

    if (!dateText) {
        return new Date();
    }

    const parts =
        dateText.split(/[/-]/).map(Number);

    if (parts.length !== 3) {
        return new Date();
    }

    if (parts[0] > 31) {

        return new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );
    }

    const year =
        parts[2] < 100
            ? 2000 + parts[2]
            : parts[2];

    return new Date(
        year,
        parts[1] - 1,
        parts[0]
    );
};


const findLabeledAmount = (
    text = "",
    labelPattern
) => {

    const matches =
        Array.from(text.matchAll(labelPattern));

    for (
        let index = matches.length - 1;
        index >= 0;
        index -= 1
    ) {

        const match =
            matches[index];

        const segment =
            text.slice(
                match.index,
                match.index + 120
            );

        const amount =
            getLineCurrencyAmount(segment);

        if (amount) {
            return amount;
        }
    }

    return 0;
};


const toNumber = (
    value,
    fallback = 0
) => {

    const number =
        Number(
            String(value || "")
                .replace(/,/g, "")
        );

    return Number.isFinite(number)
        ? number
        : fallback;
};


const parseClientExtraction = (
    value = ""
) => {

    if (!value) {
        return {};
    }

    try {

        return JSON.parse(value);

    } catch (error) {

        return {};
    }
};


// ==========================
// OCR EXTRACTION
// ==========================

const extractInvoiceData = (
    text = ""
) => {

    const lines =
        getLines(text);

    const dateMatch =
        text.match(
            /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/
        ) ||
        text.match(
            /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/
        );

    const totalLine =
        lines
            .filter((line) =>
                /\b(?:grand\s+total|total\s+amount|total)\b/i.test(line) &&
                !/\bsub\s*total\b|\bsubtotal\b/i.test(line)
            )
            .pop();

    const gstLine =
        lines
            .filter((line) =>
                /\b(?:gst|cgst|sgst|igst|tax)\b/i.test(line)
            )
            .pop();

    const amountMatches =
        lines
            .map((line) =>
                getLineCurrencyAmount(line)
            )
            .filter(Boolean);

    const labeledTotal =
        findLabeledAmount(
            text,
            /\b(?:grand\s+total|total\s+amount|total)\b/gi
        );

    const labeledTax =
        findLabeledAmount(
            text,
            /\b(?:gst|cgst|sgst|igst|tax)\b/gi
        );

    const amount =
        totalLine
            ? getLineCurrencyAmount(totalLine)
            : labeledTotal
                ? labeledTotal
                : amountMatches.length
                    ? amountMatches[
                        amountMatches.length - 1
                    ]
                    : 0;

    const tax =
        labeledTax
            ? labeledTax
            : gstLine
                ? getLineCurrencyAmount(gstLine)
                : 0;

    const subtotal =
        findLabeledAmount(
            text,
            /\bsub\s*total\b|\bsubtotal\b/gi
        );

    const invoiceIdMatch =
        text.match(
            /(?:invoice\s*(?:id|no|number|#)|inv(?:oice)?\s*(?:id|no|number|#)?)[\s:.-]*([a-z0-9-]+)/i
        );

    return {

        merchantName:
            cleanMerchantName(
                lines.find(
                    isLikelyMerchantLine
                )
            ),

        amount,

        tax,

        subtotal,

        date:
            parseInvoiceDate(
                dateMatch
                    ? dateMatch[0]
                    : ""
            ),

        invoiceId:
            invoiceIdMatch
                ? invoiceIdMatch[1].toUpperCase()
                : "",

        currency:
            /(?:₹|rs\.?|inr)/i.test(text)
                ? "INR"
                : "INR",

        items:
            lines.slice(1, 5)
    };
};


// ==========================
// UPLOAD INVOICE
// ==========================

const uploadInvoice = async (
    req,
    res
) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                message:
                    "Please upload PNG, JPG or PDF invoice"
            });
        }

        const filePath =
            req.file.path;

        const submittedText =
            (req.body.rawText || "")
                .trim();

        const clientExtraction =
            parseClientExtraction(
                req.body.extractedData
            );

        // OCR TEXT
        const text =
            submittedText ||
            await extractTextFromImage(
                filePath,
                req.file.mimetype
            );

        if (
            !text ||
            text === "OCR Failed" ||
            text === "No text found"
        ) {

            return res.status(422).json({
                message:
                    "No readable invoice text found"
            });
        }

        // EXTRACT DATA
        const {
            merchantName,
            amount,
            tax,
            subtotal,
            date,
            invoiceId,
            currency,
            items
        } = extractInvoiceData(text);

        const savedItems =
            Array.isArray(
                clientExtraction.items
            ) &&
            clientExtraction.items.length
                ? clientExtraction.items
                : items;

        const savedAmount =
            toNumber(
                clientExtraction.amount,
                amount
            );

        const savedTax =
            toNumber(
                clientExtraction.tax,
                tax
            );

        const savedSubtotal =
            toNumber(
                clientExtraction.subtotal,
                subtotal
            );

        // CATEGORY
        const category =
            clientExtraction.category ||
            categorizeExpense(
                clientExtraction.merchantName ||
                merchantName,
                savedItems
            );

        // FINAL INVOICE OBJECT
        const invoiceData = {

            user:
                req.user._id,

            merchantName:
                clientExtraction.merchantName ||
                merchantName,

            amount:
                savedAmount,

            tax:
                savedTax,

            subtotal:
                savedSubtotal,

            date:
                clientExtraction.date ||
                date,

            invoiceId:
                clientExtraction.invoiceId ||
                invoiceId,

            currency:
                clientExtraction.currency ||
                currency ||
                "INR",

            category,

            items:
                savedItems,

            rawText:
                text,

            fileName:
                req.file.originalname,

            fileType:
                req.file.mimetype,

            // IMPORTANT FIX
            fileUrl:
                `http://localhost:5000/uploads/${req.file.filename}`
        };

        // AI INSIGHTS
        invoiceData.insights =
            generateInsights(invoiceData);

        // SAVE TO DATABASE
        const invoice =
            await Invoice.create(
                invoiceData
            );

        res.status(201).json(
            invoice
        );

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message:
                "Invoice processing failed"
        });
    }
};


// ==========================
// GET ALL INVOICES
// ==========================

const getInvoices = async (
    req,
    res
) => {

    try {

        const invoices =
            await Invoice.find({
                user: req.user._id
            }).sort({
                createdAt: -1
            });

        res.json(invoices);

    } catch (error) {

        res.status(500).json({
            message:
                "Failed to fetch invoices"
        });
    }
};


// ==========================
// GET LATEST INVOICE
// ==========================

const getLatestInvoice = async (
    req,
    res
) => {

    try {

        const invoice =
            await Invoice.findOne({
                user: req.user._id
            }).sort({
                createdAt: -1
            });

        if (!invoice) {

            return res.status(404).json({
                message:
                    "No invoices found"
            });
        }

        res.json(invoice);

    } catch (error) {

        res.status(500).json({
            message:
                "Failed to fetch latest invoice"
        });
    }
};


// ==========================
// GET INVOICE BY ID
// ==========================

const getInvoiceById = async (
    req,
    res
) => {

    try {

        const invoice =
            await Invoice.findOne({

                _id:
                    req.params.id,

                user:
                    req.user._id
            });

        if (!invoice) {

            return res.status(404).json({
                message:
                    "Invoice not found"
            });
        }

        res.json(invoice);

    } catch (error) {

        res.status(500).json({
            message:
                "Failed to fetch invoice"
        });
    }
};


module.exports = {

    uploadInvoice,

    getInvoices,

    getLatestInvoice,

    getInvoiceById
};