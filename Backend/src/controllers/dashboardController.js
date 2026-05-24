const Invoice = require("../models/Invoice");

const getInvoiceTime = (invoice) =>
    new Date(invoice.createdAt || invoice.date || Date.now()).getTime();

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

        const topCategory =
            Object.entries(categoryMap)
                .sort((a, b) => b[1] - a[1])[0] || ["None", 0];

        const topMerchant =
            Object.entries(merchantMap)
                .sort((a, b) => b[1] - a[1])[0] || ["None", 0];

        const orderedByAmount =
            [...invoices].sort((a, b) =>
                (Number(b.amount) || 0) - (Number(a.amount) || 0)
            );

        const highestInvoice =
            orderedByAmount[0];

        const sortedByTime =
            [...invoices].sort((a, b) =>
                getInvoiceTime(a) - getInvoiceTime(b)
            );

        const latestInvoice =
            sortedByTime[sortedByTime.length - 1];

        const previousInvoice =
            sortedByTime[sortedByTime.length - 2];

        const latestAmount =
            latestInvoice ? Number(latestInvoice.amount) || 0 : 0;

        const previousAmount =
            previousInvoice ? Number(previousInvoice.amount) || 0 : 0;

        const trendInsight =
            latestInvoice && previousInvoice
                ? latestAmount > previousAmount
                    ? `Latest invoice spend increased by Rs. ${latestAmount - previousAmount} compared with the previous invoice.`
                    : latestAmount < previousAmount
                        ? `Latest invoice spend decreased by Rs. ${previousAmount - latestAmount} compared with the previous invoice.`
                        : "Latest invoice spend is equal to the previous invoice."
                : "Upload more invoices to calculate expense trends.";

        const insights = [
            {
                title: "Expense Summary",
                body: invoices.length
                    ? `You have ${invoices.length} saved invoice${invoices.length === 1 ? "" : "s"} totaling Rs. ${totalExpense}.`
                    : "No invoice expenses have been recorded yet."
            },
            {
                title: "Tax Summary",
                body: totalTax > 0
                    ? `Rs. ${totalTax} GST has been extracted from uploaded invoices.`
                    : "No GST has been extracted yet."
            },
            {
                title: "Top Category",
                body: topCategory[0] !== "None"
                    ? `${topCategory[0]} is your highest spend category at Rs. ${topCategory[1]}.`
                    : "Upload invoices to identify your top spend category."
            },
            {
                title: "Top Merchant",
                body: topMerchant[0] !== "None"
                    ? `${topMerchant[0]} is your top merchant with Rs. ${topMerchant[1]} recorded.`
                    : "Upload invoices to identify your top merchant."
            },
            {
                title: "Unusual Spending",
                body: highestInvoice
                    ? `${highestInvoice.merchantName || "An invoice"} is your highest invoice at Rs. ${Number(highestInvoice.amount) || 0}.`
                    : "Upload invoices to detect unusually high spending."
            },
            {
                title: "Expense Trend",
                body: trendInsight
            }
        ];

        res.json({

            totalExpense,

            totalTax,

            topCategory: topCategory[0],

            topMerchant: topMerchant[0],

            categoryBreakdown: categoryMap,

            merchantBreakdown: merchantMap,

            totalInvoices: invoices.length,

            insights,

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
                    insights: invoice.insights,
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
