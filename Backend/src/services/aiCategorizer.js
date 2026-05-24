const categorizeExpense = (merchantName = "", items = []) => {
    const text = [merchantName, ...items].join(" ").toLowerCase();

    if (/(restaurant|cafe|food|meal|grocery|market)/.test(text)) {
        return "Food";
    }

    if (/(fuel|gas|uber|taxi|transport|travel)/.test(text)) {
        return "Travel";
    }

    if (/(office|stationery|software|subscription|laptop)/.test(text)) {
        return "Office";
    }

    if (/(electronics|reliance|smartphone|phone|power bank|screen guard)/.test(text)) {
        return "Electronics";
    }

    return "General";
};

module.exports = {
    categorizeExpense
};
