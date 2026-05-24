const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    merchantName: {
        type: String
    },

    amount: {
        type: Number
    },

    tax: {
        type: Number
    },

    subtotal: {
        type: Number
    },

    date: {
        type: String
    },

    invoiceId: {
        type: String
    },

    currency: {
        type: String,
        default: "INR"
    },

    category: {
        type: String
    },

    items: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    rawText: {
        type: String
    },

    fileName: {
        type: String
    },

    fileType: {
        type: String
    },

    fileUrl: {
        type: String
    },

    insights: [
        String
    ]

}, {
    timestamps: true
});

const Invoice = mongoose.model(
    "Invoice",
    invoiceSchema
);

module.exports = Invoice;
