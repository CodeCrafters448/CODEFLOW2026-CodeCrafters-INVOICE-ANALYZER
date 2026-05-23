const Invoice = require("../models/Invoice");

const getDashboardData = async (req, res) => {

    try {

        const invoices = await Invoice.find({
            user: req.user._id
        });

        let totalExpense = 0;
        let totalTax = 0;

        const categoryMap = {};
        const merchantMap = {};

        invoices.forEach(invoice => {

            totalExpense += invoice.amount;

            totalTax += invoice.tax;

            categoryMap[invoice.category] =
                (categoryMap[invoice.category] || 0)
                + invoice.amount;

            merchantMap[invoice.merchantName] =
                (merchantMap[invoice.merchantName] || 0)
                + invoice.amount;
        });

        res.json({

            totalExpense,

            totalTax,

            categoryBreakdown: categoryMap,

            merchantBreakdown: merchantMap,

            totalInvoices: invoices.length
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