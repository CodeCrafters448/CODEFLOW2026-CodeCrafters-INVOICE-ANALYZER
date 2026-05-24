const fs = require("fs/promises");

const extractTextFromImage = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        return buffer.toString("utf8").trim() || "Unknown Merchant";
    } catch (error) {
        console.error("OCR extraction failed:", error.message);
        return "Unknown Merchant";
    }
};

module.exports = {
    extractTextFromImage
};
