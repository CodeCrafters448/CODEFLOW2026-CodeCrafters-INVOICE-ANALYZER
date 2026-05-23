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

    date: {
        type: String
    },

    category: {
        type: String
    },

    items: [
        String
    ],

    rawText: {
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