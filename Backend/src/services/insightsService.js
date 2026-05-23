const generateInsights = (invoice) => {
    const insights = [];

    if (invoice.amount > 0) {
        insights.push(`Recorded ${invoice.category} expense of ${invoice.amount}.`);
    }

    if (invoice.tax > 0) {
        insights.push(`Estimated tax is ${invoice.tax.toFixed(2)}.`);
    }

    return insights;
};

module.exports = {
    generateInsights
};
