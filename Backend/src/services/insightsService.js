const generateInsights = (invoice) => {
    const insights = [];
    const amount =
        Number(invoice.amount) || 0;

    const tax =
        Number(invoice.tax) || 0;

    if (amount > 0) {
        insights.push(`Recorded ${invoice.category} expense of Rs. ${amount}.`);
    }

    if (tax > 0) {
        insights.push(`GST captured for this invoice is Rs. ${tax.toFixed(2)}.`);
    }

    if (invoice.merchantName) {
        insights.push(`${invoice.merchantName} is now tracked in merchant spend analytics.`);
    }

    if (invoice.items && invoice.items.length) {
        insights.push(`${invoice.items.length} purchased item rows were extracted for review.`);
    }

    if (amount >= 10000) {
        insights.push("This is a high-value invoice and should be reviewed carefully.");
    }

    if (invoice.subtotal && tax) {
        const effectiveTaxRate =
            ((tax / Number(invoice.subtotal)) * 100).toFixed(1);

        insights.push(`Effective GST rate is approximately ${effectiveTaxRate}%.`);
    }

    return insights;
};

module.exports = {
    generateInsights
};
