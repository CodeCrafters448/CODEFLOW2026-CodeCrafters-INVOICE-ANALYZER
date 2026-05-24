const vision =
    require("@google-cloud/vision");

const fs =
    require("fs");

const zlib =
    require("zlib");

const client =
    new vision.ImageAnnotatorClient();

const decodePdfString = (value = "") =>
    value
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\n")
        .replace(/\\t/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");

const extractTextOperators = (content = "") => {

    const text = [];

    const stringPattern =
        /\((?:\\.|[^\\)])*\)\s*Tj|\[(.*?)\]\s*TJ/gms;

    let match;

    while ((match = stringPattern.exec(content))) {

        const operator =
            match[0];

        const strings =
            operator.match(/\((?:\\.|[^\\)])*\)/g) || [];

        strings.forEach((item) => {
            text.push(
                decodePdfString(
                    item.slice(1, -1)
                )
            );
        });
    }

    return text.join(" ");
};

const extractEmbeddedPdfText = (filePath) => {

    const buffer =
        fs.readFileSync(filePath);

    const binary =
        buffer.toString("latin1");

    const chunks = [
        extractTextOperators(binary)
    ];

    const streamPattern =
        /<<(.*?)>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/gm;

    let match;

    while ((match = streamPattern.exec(binary))) {

        const dictionary =
            match[1];

        const streamStart =
            match.index + match[0].indexOf(match[2]);

        const streamBuffer =
            buffer.subarray(
                streamStart,
                streamStart + match[2].length
            );

        try {

            const content =
                /FlateDecode/.test(dictionary)
                    ? zlib.inflateSync(streamBuffer).toString("latin1")
                    : streamBuffer.toString("latin1");

            chunks.push(
                extractTextOperators(content)
            );

        } catch (error) {
            // Some streams are images or compressed with unsupported filters.
        }
    }

    return chunks
        .join("\n")
        .replace(/\s+\n/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
};

const extractTextFromImage =
    async (filePath, mimeType = "") => {

    try {

        if (mimeType === "application/pdf") {

            const embeddedText =
                extractEmbeddedPdfText(filePath);

            if (embeddedText) {
                return embeddedText;
            }

            const [result] =
                await client.batchAnnotateFiles({
                    requests: [
                        {
                            inputConfig: {
                                mimeType,
                                content:
                                    fs.readFileSync(filePath)
                            },
                            features: [
                                {
                                    type: "DOCUMENT_TEXT_DETECTION"
                                }
                            ]
                        }
                    ]
                });

            const responses =
                result.responses?.[0]?.responses || [];

            const extractedText =
                responses
                    .map((response) =>
                        response.fullTextAnnotation?.text || ""
                    )
                    .filter(Boolean)
                    .join("\n")
                    .trim();

            return extractedText || "No text found";
        }

        const [result] =
            await client.textDetection(
                filePath
            );

        const detections =
            result.textAnnotations;

        const extractedText =
            detections[0]?.description
            || "No text found";

        return extractedText;

    } catch (error) {

        console.log(
            "Google Vision OCR Error:",
            error
        );

        return "OCR Failed";
    }
};

module.exports = {
    extractTextFromImage
};
