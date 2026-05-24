let liveExpenseChart;
let dashboardPieChart;
let dashboardBarChart;
let currentPreviewUrl;
let uploadOcrRunId = 0;
let currentUploadPreviewDataUrl = "";

const AUTH_TOKEN_KEY =
  "token";

const AUTH_USER_KEY =
  "user";

const LATEST_INVOICE_KEY =
  "latestInvoiceExtractionV2";

function getElement(id) {
  return document.getElementById(id);
}

function money(value) {

  if (value === undefined || value === null || value === "") {
    return "Rs. 0";
  }

  return `Rs. ${value}`;
}

function displayDate(value) {

  if (!value) {
    return "-";
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value)) {
    return value;
  }

  const date =
    new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString();
}

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isPdfFile(file) {

  return Boolean(
    file &&
    (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    )
  );
}

function isSupportedInvoiceFile(file) {

  return Boolean(
    file &&
    (
      file.type.startsWith("image/") ||
      isPdfFile(file)
    )
  );
}

function readFileAsDataUrl(file) {

  return new Promise((resolve) => {

    if (!file) {
      resolve("");
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      () => resolve(reader.result || "");

    reader.onerror =
      () => resolve("");

    reader.readAsDataURL(file);
  });
}

function saveUserSession(token, user) {

  sessionStorage.setItem(
    AUTH_TOKEN_KEY,
    token
  );

  sessionStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(user || {})
  );

  localStorage.removeItem(
    AUTH_TOKEN_KEY
  );

  localStorage.removeItem(
    AUTH_USER_KEY
  );
}

function getAuthToken() {

  return sessionStorage.getItem(
    AUTH_TOKEN_KEY
  );
}

function getSessionUser() {

  try {

    return JSON.parse(
      sessionStorage.getItem(
        AUTH_USER_KEY
      ) || "{}"
    );

  } catch (error) {

    return {};
  }
}

function setSessionUser(user) {

  sessionStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(user || {})
  );
}

function clearUserSession() {

  sessionStorage.removeItem(
    AUTH_TOKEN_KEY
  );

  sessionStorage.removeItem(
    AUTH_USER_KEY
  );
}

function formatProfileDate(value) {

  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

function updateAuthNavigation() {

  const navList =
    document.querySelector(".topbar ul");

  if (!navList) {
    return;
  }

  const authLink =
    Array.from(
      navList.querySelectorAll("a")
    ).find((link) => (
      link.getAttribute("href") === "login.html" ||
      link.getAttribute("href") === "profile.html"
    ));

  if (!authLink) {
    return;
  }

  if (getAuthToken()) {

    authLink.href =
      "profile.html";

    authLink.textContent =
      "Profile";

    authLink.classList.toggle(
      "active",
      window.location.pathname.endsWith(
        "profile.html"
      )
    );

    return;
  }

  authLink.href =
    "login.html";

  authLink.textContent =
    "Login";

  authLink.classList.toggle(
    "active",
    window.location.pathname.endsWith(
      "login.html"
    )
  );
}

function renderProfilePage() {

  const profileDetails =
    getElement("profileDetails");

  if (!profileDetails) {
    return;
  }

  if (!getAuthToken()) {

    window.location.href =
      "login.html";

    return;
  }

  const user =
    getSessionUser();

  const profileAvatar =
    getElement("profileAvatar");

  const profileName =
    getElement("profileName");

  const profileEmail =
    getElement("profileEmail");

  if (profileAvatar) {

    profileAvatar.textContent =
      (user.name || user.email || "U")
        .trim()
        .charAt(0)
        .toUpperCase();
  }

  if (profileName) {

    profileName.textContent =
      user.name || "Profile";
  }

  if (profileEmail) {

    profileEmail.textContent =
      user.email || "-";
  }

  const values = [
    user.name || "-",
    user.email || "-",
    formatProfileDate(user.createdAt)
  ];

  profileDetails
    .querySelectorAll("td")
    .forEach((cell, index) => {

      cell.textContent =
        values[index] || "-";
    });
}

function showProfileMessage(message) {

  const profileMessage =
    getElement("profileMessage");

  if (profileMessage) {
    profileMessage.textContent =
      message;
  }
}

async function readResponseJson(response) {

  try {

    return await response.json();

  } catch (error) {

    return {
      message:
        response.status === 404
          ? "Update endpoint not found. Restart the backend server and try again."
          : "Request failed. Please try again."
    };
  }
}

function reloadProfilePage() {

  window.location.reload();
}

function setupProfileActions() {

  const logoutButton =
    getElement("logoutButton");

  const nameChangeForm =
    getElement("nameChangeForm");

  const passwordChangeForm =
    getElement("passwordChangeForm");

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      () => {

        clearUserSession();

        window.location.href =
          "login.html";
      }
    );
  }

  if (nameChangeForm) {

    nameChangeForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        const name =
          getElement("newName").value.trim();

        if (!name) {
          showProfileMessage("Please enter a name.");
          return;
        }

        try {

          const response =
            await fetch(
              "http://localhost:5000/api/auth/profile",
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:
                    `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ name })
              }
            );

          const data =
            await readResponseJson(response);

          if (!response.ok) {
            showProfileMessage(
              data.message ||
              "Name update failed"
            );
            return;
          }

          setSessionUser(data);
          reloadProfilePage();

        } catch (error) {

          console.log(error);
          showProfileMessage("Name update failed.");
        }
      }
    );
  }

  if (passwordChangeForm) {

    passwordChangeForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        const currentPassword =
          getElement("currentPassword").value;

        const newPassword =
          getElement("newPassword").value;

        try {

          const response =
            await fetch(
              "http://localhost:5000/api/auth/password",
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:
                    `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                  currentPassword,
                  newPassword
                })
              }
            );

          const data =
            await readResponseJson(response);

          if (!response.ok) {
            showProfileMessage(
              data.message ||
              "Password update failed"
            );
            return;
          }

          reloadProfilePage();

        } catch (error) {

          console.log(error);
          showProfileMessage("Password update failed.");
        }
      }
    );
  }
}


// ==========================
// IMAGE PREVIEW + DRAG DROP
// ==========================

function renderFilePreview(file) {

  const preview =
    getElement("preview");

  const pdfPreview =
    getElement("pdfPreview");

  const pdfPreviewName =
    getElement("pdfPreviewName");

  const loader =
    getElement("loader");

  if (!preview || !file) {
    return false;
  }

  if (!isSupportedInvoiceFile(file)) {

    preview.removeAttribute("src");

    preview.hidden =
      true;

    if (pdfPreview) {
      pdfPreview.hidden = true;
    }

    if (loader) {

      loader.innerText =
        "Please choose a PNG, JPG, or PDF invoice.";
    }

    return false;
  }

  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
  }

  currentPreviewUrl =
    URL.createObjectURL(file);

  if (isPdfFile(file)) {

    preview.removeAttribute("src");

    preview.hidden =
      true;

    preview.style.display =
      "none";

    if (pdfPreview) {
      pdfPreview.hidden = false;
    }

    if (pdfPreviewName) {
      pdfPreviewName.textContent =
        file.name;
    }

  } else {

    preview.src =
      currentPreviewUrl;

    preview.hidden =
      false;

    preview.style.display =
      "block";

    if (pdfPreview) {
      pdfPreview.hidden = true;
    }
  }

  if (loader) {

    loader.innerText =
      `${file.name} ready to analyze`;
  }

  return true;
}

function setUploadCardCollapsed(isCollapsed) {

  const uploadCard =
    document.querySelector(".upload-card");

  if (!uploadCard) {
    return;
  }

  uploadCard.classList.toggle(
    "is-collapsed",
    isCollapsed
  );
}

function detectInvoiceCategory(text) {

  const content =
    text.toLowerCase();

  if (
    content.includes("restaurant") ||
    content.includes("cafe") ||
    content.includes("food")
  ) {
    return "Food";
  }

  if (
    content.includes("uber") ||
    content.includes("ola") ||
    content.includes("travel") ||
    content.includes("fuel")
  ) {
    return "Travel";
  }

  if (
    content.includes("electronics") ||
    content.includes("reliance")
  ) {
    return "Electronics";
  }

  if (
    content.includes("amazon") ||
    content.includes("shopping") ||
    content.includes("store")
  ) {
    return "Shopping";
  }

  if (
    content.includes("electricity") ||
    content.includes("utility") ||
    content.includes("bill")
  ) {
    return "Utilities";
  }

  return "General";
}

function getLineCurrencyAmount(line) {

  const currencyMatch =
    line.match(
      /(?:rs\.?|inr|₹)\s*(\d[\d,]*(?:\.\d{2})?)/i
    );

  if (currencyMatch) {
    return currencyMatch[1].replace(/,/g, "");
  }

  const numberMatches =
    line.match(/\d[\d,]*(?:\.\d{2})?/g) || [];

  return numberMatches.length
    ? numberMatches[numberMatches.length - 1].replace(/,/g, "")
    : "";
}

function extractInvoiceIdFromText(text) {

  const match =
    text.match(
      /(?:invoice\s*(?:id|no|number|#)|inv(?:oice)?\s*(?:id|no|number|#)?)[\s:.-]*([a-z0-9-]+)/i
    );

  return match ? match[1].toUpperCase() : "-";
}

function extractSubtotalFromText(lines) {

  const subtotalLine =
    lines
      .filter((line) =>
        /\bsub\s*total\b|\bsubtotal\b/i.test(line)
      )
      .pop();

  return subtotalLine
    ? getLineCurrencyAmount(subtotalLine) || "-"
    : "-";
}

function findLabeledAmount(text, labelPattern) {

  const matches =
    Array.from(text.matchAll(labelPattern));

  for (let index = matches.length - 1; index >= 0; index -= 1) {

    const match =
      matches[index];

    const segment =
      text.slice(match.index, match.index + 120);

    const amount =
      getLineCurrencyAmount(segment);

    if (amount) {
      return amount;
    }
  }

  return "";
}

function extractInvoiceItems(lines) {

  const itemRows = [];

  lines.forEach((line) => {

    if (
      !/(?:rs\.?|inr|₹)\s*\d/i.test(line) ||
      /\b(?:subtotal|total|gst|tax)\b/i.test(line)
    ) {
      return;
    }

    const price =
      getLineCurrencyAmount(line);

    const beforePrice =
      line.replace(
        /(?:rs\.?|inr|₹)\s*\d[\d,]*(?:\.\d{2})?.*$/i,
        ""
      ).trim();

    const quantityMatch =
      beforePrice.match(/\b(\d+)\s*$/);

    const quantity =
      quantityMatch ? quantityMatch[1] : "1";

    const item =
      beforePrice
        .replace(/\b\d+\s*$/g, "")
        .trim();

    if (!item || !price) {
      return;
    }

    itemRows.push({
      item,
      quantity,
      price
    });
  });

  return itemRows.slice(0, 8);
}

function isLikelyMerchantLine(line) {

  const normalized =
    line.replace(/[^a-z0-9]/gi, "");

  if (normalized.length < 3) {
    return false;
  }

  return !/^(invoice|bill|date|item|qty|quantity|price|amount|subtotal|total|gst|tax|thank)/i.test(
    normalized
  );
}

function cleanMerchantName(line) {

  return (line || "-")
    .split(/\b(?:invoice|date|item|qty|quantity|subtotal|total|gst|tax)\b/i)[0]
    .replace(/[|:]+$/g, "")
    .trim() || "-";
}

function extractInvoiceDataFromText(text) {

  const lines =
    text.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const dateMatch =
    text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/) ||
    text.match(/\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/);

  const totalLine =
    lines
      .filter((line) =>
        /\b(?:grand\s+total|total\s+amount|total)\b/i.test(line) &&
        !/\bsub\s*total\b|\bsubtotal\b/i.test(line)
      )
      .pop();

  const gstLine =
    lines
      .filter((line) =>
        /\b(?:gst|cgst|sgst|igst|tax)\b/i.test(line)
      )
      .pop();

  const amountMatches =
    lines
      .map((line) => getLineCurrencyAmount(line))
      .filter(Boolean);

  const labeledTotal =
    findLabeledAmount(
      text,
      /\b(?:grand\s+total|total\s+amount|total)\b/gi
    );

  const subtotal =
    extractSubtotalFromText(lines);

  const labeledSubtotal =
    findLabeledAmount(text, /\bsub\s*total\b|\bsubtotal\b/gi) ||
    subtotal;

  const labeledTax =
    findLabeledAmount(text, /\b(?:gst|cgst|sgst|igst|tax)\b/gi);

  const amount =
    totalLine
      ? getLineCurrencyAmount(totalLine)
      : labeledTotal
      ? labeledTotal
      : amountMatches.length
      ? amountMatches[amountMatches.length - 1]
      : "-";

  const merchantName =
    cleanMerchantName(
      lines.find(isLikelyMerchantLine)
    );

  return {
    merchantName,
    date:
      dateMatch ? dateMatch[0] : "-",
    invoiceId:
      extractInvoiceIdFromText(text),
    currency:
      /(?:₹|rs\.?|inr)/i.test(text) ? "INR" : "-",
    subtotal:
      labeledSubtotal,
    amount,
    tax:
      labeledTax ||
      (gstLine ? getLineCurrencyAmount(gstLine) || "-" : "-"),
    items:
      extractInvoiceItems(lines),
    category:
      text.trim() ? detectInvoiceCategory(text) : "-"
  };
}

function renderInvoiceDetails(data) {

  const details =
    getElement("invoiceDetails");

  if (!details) {
    return;
  }

  details.innerHTML = `
    <p><strong>Merchant:</strong> ${data.merchantName || "-"}</p>
    <p><strong>Date:</strong> ${data.date || "-"}</p>
    <p><strong>Total Amount:</strong> ${data.amount && data.amount !== "-" ? `Rs. ${data.amount}` : "-"}</p>
    <p><strong>GST:</strong> ${data.tax && data.tax !== "-" ? `Rs. ${data.tax}` : "-"}</p>
    <p><strong>Category:</strong> ${data.category || "-"}</p>
  `;
}

function renderRawText(text) {

  const rawText =
    getElement("rawText");

  if (rawText) {
    rawText.textContent =
      text || "No text extracted.";
  }
}

function isUsableRawText(text = "") {

  const value =
    text.trim();

  return Boolean(
    value &&
    value !== "OCR text will appear here." &&
    value !== "Reading invoice image..." &&
    value !== "Reading PDF invoice..." &&
    value !== "PDF selected. Upload it to extract invoice details." &&
    value !== "No text extracted."
  );
}

async function extractTextFromPdf(file) {

  if (!window.pdfjsLib) {
    throw new Error(
      "PDF reader is still loading. Please try again in a moment."
    );
  }

  if (window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  }

  const pdf =
    await window.pdfjsLib.getDocument({
      data:
        await file.arrayBuffer()
    }).promise;

  const extractedPages = [];
  const pageLimit =
    Math.min(pdf.numPages, 3);

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {

    const page =
      await pdf.getPage(pageNumber);

    const textContent =
      await page.getTextContent();

    const embeddedText =
      textContent.items
        .map((item) => item.str)
        .join(" ")
        .trim();

    if (embeddedText) {
      extractedPages.push(embeddedText);
      continue;
    }

    if (!window.Tesseract) {
      throw new Error(
        "OCR library is still loading. Please try again in a moment."
      );
    }

    const viewport =
      page.getViewport({
        scale: 2
      });

    const canvas =
      document.createElement("canvas");

    canvas.width =
      viewport.width;

    canvas.height =
      viewport.height;

    await page.render({
      canvasContext:
        canvas.getContext("2d"),
      viewport
    }).promise;

    const result =
      await Tesseract.recognize(
        canvas,
        "eng"
      );

    extractedPages.push(
      result.data.text.trim()
    );
  }

  return extractedPages
    .filter(Boolean)
    .join("\n")
    .trim();
}

function saveLatestInvoiceExtraction(data) {

  try {

    sessionStorage.setItem(
      LATEST_INVOICE_KEY,
      JSON.stringify(data || {})
    );

  } catch (error) {

    try {

      const lightweightData = {
        ...data,
        previewDataUrl: ""
      };

      sessionStorage.setItem(
        LATEST_INVOICE_KEY,
        JSON.stringify(lightweightData)
      );

    } catch (storageError) {

      console.log(storageError);
    }
  }
}

function buildExtractedPayload(rawText = "") {

  return isUsableRawText(rawText)
    ? extractInvoiceDataFromText(rawText)
    : {};
}

function normalizeLatestInvoiceData(data = {}, file = null, rawText = "") {

  const parsed =
    rawText ? extractInvoiceDataFromText(rawText) : {};

  return {
    merchantName:
      data.merchantName || parsed.merchantName || "-",
    date:
      data.date
        ? displayDate(data.date)
        : parsed.date || "-",
    invoiceId:
      data.invoiceId || parsed.invoiceId || "-",
    currency:
      data.currency || parsed.currency || "INR",
    subtotal:
      data.subtotal || parsed.subtotal || "-",
    amount:
      data.amount || parsed.amount || "-",
    tax:
      data.tax || parsed.tax || "-",
    category:
      data.category || parsed.category || "-",
    items:
      parsed.items && parsed.items.length
        ? parsed.items
        : data.items || [],
    rawText:
      rawText || data.rawText || "",
    fileName:
      file ? file.name : data.fileName || "",
    fileType:
      file
        ? file.type || (isPdfFile(file) ? "application/pdf" : "")
        : data.fileType || "",
    fileUrl:
      data.fileUrl
        ? data.fileUrl.startsWith("http")
          ? data.fileUrl
          : `http://localhost:5000${data.fileUrl}`
        : "",
    previewDataUrl:
      currentUploadPreviewDataUrl || data.previewDataUrl || ""
  };
}

function renderExtractionPage() {

  const merchant =
    getElement("extractionMerchant");

  if (!merchant) {
    return;
  }

  let data = {};

  try {
    data = JSON.parse(
      sessionStorage.getItem(LATEST_INVOICE_KEY) || "{}"
    );
  } catch (error) {
    data = {};
  }

  const status =
    getElement("extractionStatus");

  const image =
    getElement("extractionImage");

  const emptyDocument =
    getElement("extractionEmptyDocument");

  const pdf =
    getElement("extractionPdf");

  if (!Object.keys(data).length) {

    if (status) {
      status.textContent = "Waiting";
      status.className = "status-pill waiting";
    }

    if (image) {
      image.hidden = true;
    }

    if (emptyDocument) {
      emptyDocument.hidden = false;
    }

    if (pdf) {
      pdf.hidden = true;
    }

    return;
  }

  const setText = (id, value) => {

    const element =
      getElement(id);

    if (element) {
      element.textContent =
        value || "-";
    }
  };

  setText("extractionMerchant", data.merchantName);
  setText("extractionDate", data.date);
  setText("extractionInvoiceId", data.invoiceId);
  setText("extractionCurrency", data.currency);
  setText("extractionSubtotal", data.subtotal);
  setText("extractionGst", data.tax);
  setText("extractionTotal", data.amount);
  setText("extractionCategory", data.category);

  const categoryBadge =
    getElement("extractionCategory");

  if (categoryBadge) {
    categoryBadge.className =
      `category-badge ${(data.category || "general").toLowerCase()}`;
  }

  const pdfName =
    getElement("extractionPdfName");

  if (status) {
    status.textContent = "Verified";
    status.className = "status-pill success";
  }

  if (emptyDocument) {
    emptyDocument.hidden = true;
  }

  if (data.fileType === "application/pdf") {

    if (image) {
      image.hidden = true;
    }

    if (pdf) {
      pdf.hidden = false;
    }

    if (pdfName) {
      pdfName.textContent =
        data.fileName || "Invoice PDF";
    }

  } else if ((data.previewDataUrl || data.fileUrl) && image) {

    image.src =
      data.previewDataUrl || data.fileUrl;

    image.hidden =
      false;

    if (pdf) {
      pdf.hidden = true;
    }
  }

  const itemsBody =
    getElement("extractionItems");

  if (itemsBody && data.items && data.items.length) {

    itemsBody.innerHTML =
      data.items.map((item) => `
        <tr>
          <td>${escapeHtml(item.item || item)}</td>
          <td>${escapeHtml(item.quantity || "-")}</td>
          <td>Rs. ${escapeHtml(item.price || "-")}</td>
        </tr>
      `).join("");
  } else if (itemsBody) {
    itemsBody.innerHTML = "";
  }
}

async function fetchLatestInvoiceForExtraction() {

  if (!getElement("extractionMerchant")) {
    return;
  }

  const token =
    getAuthToken();

  if (!token) {
    renderExtractionPage();
    return;
  }

  try {

    const response =
      await fetch(
        "http://localhost:5000/api/invoice",
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await readResponseJson(response);

    if (!response.ok || !Array.isArray(data) || !data.length) {
      renderExtractionPage();
      return;
    }

    saveLatestInvoiceExtraction(
      normalizeLatestInvoiceData(
        data[0],
        null,
        data[0].rawText || ""
      )
    );

    renderExtractionPage();

  } catch (error) {

    console.log(error);
    renderExtractionPage();
  }
}

async function analyzeSelectedInvoice(file) {

  const loader =
    getElement("loader");

  if (!isSupportedInvoiceFile(file)) {
    return;
  }

  if (isPdfFile(file)) {

    const runId =
      ++uploadOcrRunId;

    setUploadCardCollapsed(true);

    renderInvoiceDetails({
      merchantName: "-",
      date: "-",
      amount: "-",
      tax: "-",
      category: "-"
    });

    renderRawText(
      "Reading PDF invoice..."
    );

    if (loader) {
      loader.innerText =
        `${file.name} uploaded. Reading PDF...`;
    }

    try {

      const text =
        await extractTextFromPdf(file);

      if (runId !== uploadOcrRunId) {
        return "";
      }

      if (!text) {
        throw new Error(
          "No readable text found in this PDF."
        );
      }

      renderRawText(text);

      renderInvoiceDetails(
        extractInvoiceDataFromText(text)
      );

      if (loader) {
        loader.innerText =
          `${file.name} ready to save`;
      }

      return text;

    } catch (error) {

      console.log(error);

      if (runId !== uploadOcrRunId) {
        return "";
      }

      renderRawText(
        error.message ||
        "Unable to read text from this PDF."
      );

      if (loader) {
        loader.innerText =
          `${file.name} uploaded`;
      }

      return "";
    }
  }

  const runId =
    ++uploadOcrRunId;

  setUploadCardCollapsed(true);

  renderInvoiceDetails({
    merchantName: "-",
    date: "-",
    amount: "-",
    tax: "-",
    category: "-"
  });

  renderRawText(
    "Reading invoice image..."
  );

  if (loader) {
    loader.innerText =
      `${file.name} uploaded. Reading text...`;
  }

  try {

    if (!window.Tesseract) {
      throw new Error(
        "OCR library is still loading. Please try again in a moment."
      );
    }

    const result =
      await Tesseract.recognize(
        file,
        "eng"
      );

    if (runId !== uploadOcrRunId) {
      return;
    }

    const text =
      result.data.text.trim();

    renderRawText(text);

    renderInvoiceDetails(
      extractInvoiceDataFromText(text)
    );

    if (loader) {
      loader.innerText =
        `${file.name} ready to save`;
    }

    return text;

  } catch (error) {

    console.log(error);

    if (runId !== uploadOcrRunId) {
      return;
    }

    renderRawText(
      error.message ||
      "Unable to read text from this image."
    );

    if (loader) {
      loader.innerText =
        `${file.name} uploaded`;
    }

    return "";
  }
}

function setupUploadPreview() {

  const fileInput =
    getElement("invoiceFile");

  const preview =
    getElement("preview");

  const dropZone =
    getElement("dropZone");

  if (!fileInput || !preview) {
    return;
  }

  // FILE SELECT PREVIEW
  fileInput.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files[0];

      if (renderFilePreview(file)) {
        analyzeSelectedInvoice(file);
      }
    }
  );

  if (!dropZone) {
    return;
  }

  // DRAG ENTER + OVER
  [
    "dragenter",
    "dragover"
  ].forEach((eventName) => {

    dropZone.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

        dropZone.classList.add(
          "is-dragging"
        );
      }
    );
  });


  // DRAG LEAVE + DROP
  [
    "dragleave",
    "drop"
  ].forEach((eventName) => {

    dropZone.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

        dropZone.classList.remove(
          "is-dragging"
        );
      }
    );
  });


  // DROP FILE
  dropZone.addEventListener(
    "drop",
    (event) => {

      const file =
        event.dataTransfer.files[0];

      if (!file) {
        return;
      }

      fileInput.files =
        event.dataTransfer.files;

      if (renderFilePreview(file)) {
        analyzeSelectedInvoice(file);
      }
    }
  );
}

function setupUploadForm() {

  const form =
    getElement("uploadForm");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      await uploadInvoice();
    }
  );
}


// ==========================
// UPLOAD INVOICE
// ==========================

async function uploadInvoice() {

  const fileInput =
    getElement("invoiceFile");

  const loader =
    getElement("loader");

  const rawText =
    getElement("rawText");

  const details =
    getElement("invoiceDetails");

  if (!fileInput || !fileInput.files[0]) {

    alert(
      "Please select invoice image or PDF"
    );

    return;
  }

  const file =
    fileInput.files[0];

  if (!renderFilePreview(file)) {
    return;
  }

  currentUploadPreviewDataUrl =
    await readFileAsDataUrl(file);

  let submittedRawText =
    rawText
      ? rawText.textContent.trim()
      : "";

  if (isPdfFile(file) && !isUsableRawText(submittedRawText)) {
    submittedRawText =
      await analyzeSelectedInvoice(file);
  }

  if (loader) {

    loader.innerText =
      "Uploading and analyzing invoice...";
  }

  const token =
    getAuthToken();

  if (!token) {

    alert("Please login first");

    window.location.href =
      "login.html";

    return;
  }

  const formData =
    new FormData();

  formData.append(
    "invoice",
    file
  );

  if (isUsableRawText(submittedRawText)) {
    formData.append(
      "rawText",
      submittedRawText
    );

    formData.append(
      "extractedData",
      JSON.stringify(
        buildExtractedPayload(submittedRawText)
      )
    );
  }

  try {

    const response = await fetch(
      "http://localhost:5000/api/invoice/upload",
      {

        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`
        },

        body: formData
      }
    );

    const data =
      await readResponseJson(response);

    console.log(data);

    if (response.ok) {

      if (loader) {

        loader.innerText =
          "Invoice Uploaded Successfully";
      }

      const currentRawText =
        rawText
          ? rawText.textContent.trim()
          : "";

      const hasClientText =
        isUsableRawText(currentRawText);

      const latestInvoice =
        normalizeLatestInvoiceData(
          data,
          file,
          data.rawText || (hasClientText ? currentRawText : "")
        );

      saveLatestInvoiceExtraction(latestInvoice);

      if (details && !hasClientText) {

        renderInvoiceDetails(latestInvoice);
      }

      if (rawText && !hasClientText) {

        rawText.textContent =
          data.rawText ||
          "No text extracted";
      }

    } else {

      if (loader) {

        loader.innerText =
          data.message ||
          "Upload failed";
      }
    }

  } catch (error) {

    console.log(error);

    if (loader) {

      loader.innerText =
        "Server Error";
    }
  }
}


// ==========================
// FETCH DASHBOARD DATA
// ==========================

async function fetchDashboardData() {

  try {

    const token =
      getAuthToken();

    if (!token) {
      return;
    }

    const response =
      await fetch(
        "http://localhost:5000/api/dashboard",
        {

          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await readResponseJson(response);

    console.log(data);

    if (!response.ok) {
      return;
    }

    // UPDATE KPI CARDS
    const totalSpent =
      getElement("totalSpent");

    const totalGST =
      getElement("totalGST");

    const topCategory =
      getElement("topCategory");

    if (totalSpent) {

      totalSpent.innerText =
        money(data.totalExpense);
    }

    if (totalGST) {

      totalGST.innerText =
        money(data.totalTax);
    }

    if (topCategory) {

      const categories =
        Object.entries(
          data.categoryBreakdown
        );

      let top = "None";

      if (categories.length > 0) {

        top =
          categories.sort(
            (a, b) => b[1] - a[1]
          )[0][0];
      }

      topCategory.innerText =
        top;
    }

    renderDashboardCharts(data);

    renderDashboardInvoices(data.invoices || []);

  } catch (error) {

    console.log(error);
  }
}

function renderDashboardInvoices(invoices) {

  const body =
    getElement("dashboardInvoices");

  if (!body) {
    return;
  }

  if (!invoices.length) {
    body.innerHTML =
      `<tr><td colspan="6">No extracted invoices yet</td></tr>`;
    return;
  }

  body.innerHTML =
    invoices.slice(0, 8).map((invoice) => `
      <tr>
        <td>${escapeHtml(invoice.merchantName || "-")}</td>
        <td>${escapeHtml(displayDate(invoice.date))}</td>
        <td>${escapeHtml(invoice.invoiceId || "-")}</td>
        <td>${escapeHtml(invoice.category || "-")}</td>
        <td>${escapeHtml(money(invoice.tax))}</td>
        <td>${escapeHtml(money(invoice.amount))}</td>
      </tr>
    `).join("");
}


// ==========================
// DASHBOARD CHARTS
// ==========================

function renderDashboardCharts(data) {

  const pie =
    getElement("pieChart");

  const bar =
    getElement("barChart");

  if (!pie || !bar) {
    return;
  }

  if (!window.Chart) {
    return;
  }

  if (dashboardPieChart) {
    dashboardPieChart.destroy();
  }

  if (dashboardBarChart) {
    dashboardBarChart.destroy();
  }

  const categoryBreakdown =
    data.categoryBreakdown || {};

  const merchantBreakdown =
    data.merchantBreakdown || {};

  const categoryLabels =
    Object.keys(categoryBreakdown);

  const merchantLabels =
    Object.keys(merchantBreakdown);

  // PIE CHART
  dashboardPieChart =
    new Chart(pie, {

    type: "doughnut",

    data: {

      labels:
        categoryLabels.length
          ? categoryLabels
          : ["No data"],

      datasets: [{

        data:
          categoryLabels.length
            ? Object.values(categoryBreakdown)
            : [1],

        backgroundColor: [
          "#3b82f6",
          "#60a5fa",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6"
        ]
      }]
    },

    options: {

      responsive: true,

      plugins: {

        legend: {

          position: "bottom",

          labels: {
            color: "#ffffff"
          }
        }
      }
    }
  });


  // BAR CHART
  dashboardBarChart =
    new Chart(bar, {

    type: "bar",

    data: {

      labels:
        merchantLabels.length
          ? merchantLabels
          : ["No data"],

      datasets: [{

        label: "Expenses",

        data:
          merchantLabels.length
            ? Object.values(merchantBreakdown)
            : [0],

        backgroundColor:
          "#3b82f6"
      }]
    },

    options: {

      responsive: true,

      plugins: {

        legend: {

          labels: {
            color: "#ffffff"
          }
        }
      },

      scales: {

        y: {

          beginAtZero: true,

          ticks: {
            color: "#ffffff"
          }
        },

        x: {

          ticks: {
            color: "#ffffff"
          }
        }
      }
    }
  });
}


// ==========================
// PAGE LOAD
// ==========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupUploadPreview();

    setupUploadForm();

    updateAuthNavigation();

    renderProfilePage();

    setupProfileActions();

    fetchLatestInvoiceForExtraction();

    if (
      getElement("totalSpent") &&
      getElement("totalGST") &&
      getElement("topCategory")
    ) {
      fetchDashboardData();
    }
  }
);
