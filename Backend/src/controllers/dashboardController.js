const Invoice = require("../models/Invoice");

const getDashboardData = async (req, res) => {

    try {

        const invoices = await Invoice.find({
            user: req.user._id
        }).sort({
            createdAt: -1
        });

        let totalExpense = 0;
        let totalTax = 0;

        const categoryMap = {};
        const merchantMap = {};

        invoices.forEach(invoice => {

            const amount =
                Number(invoice.amount) || 0;

            const tax =
                Number(invoice.tax) || 0;

            const category =
                invoice.category || "Uncategorized";

            const merchant =
                invoice.merchantName || "Unknown Merchant";

            totalExpense += amount;

            totalTax += tax;

            categoryMap[category] =
                (categoryMap[category] || 0)
                + amount;

            merchantMap[merchant] =
                (merchantMap[merchant] || 0)
                + amount;
        });

        res.json({

            totalExpense,

            totalTax,

            categoryBreakdown: categoryMap,

            merchantBreakdown: merchantMap,

            totalInvoices: invoices.length,

            invoices:
                invoices.map((invoice) => ({
                    id: invoice._id,
                    merchantName: invoice.merchantName,
                    amount: invoice.amount,
                    tax: invoice.tax,
                    subtotal: invoice.subtotal,
                    date: invoice.date,
                    invoiceId: invoice.invoiceId,
                    currency: invoice.currency,
                    category: invoice.category,
                    items: invoice.items,
                    rawText: invoice.rawText,
                    fileName: invoice.fileName,
                    fileType: invoice.fileType,
                    fileUrl: invoice.fileUrl,
                    createdAt: invoice.createdAt
                }))
        });

    } catch (error) {

        res.status(500).json({
            message: "Server Error"
        });
    }
};

module.exports = {
    getDashboardData
};
