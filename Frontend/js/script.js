let liveExpenseChart;
let currentPreviewUrl;

function getElement(id) {
  return document.getElementById(id);
}

function money(value) {

  if (!value) {
    return "Rs. 0";
  }

  return `Rs. ${value}`;
}


// ==========================
// IMAGE PREVIEW + DRAG DROP
// ==========================

function renderFilePreview(file) {

  const preview =
    getElement("preview");

  const loader =
    getElement("loader");

  if (!preview || !file) {
    return false;
  }

  if (!file.type.startsWith("image/")) {

    preview.removeAttribute("src");

    preview.hidden =
      true;

    if (loader) {

      loader.innerText =
        "Please choose a PNG or JPG invoice image.";
    }

    return false;
  }

  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
  }

  currentPreviewUrl =
    URL.createObjectURL(file);

  preview.src =
    currentPreviewUrl;

  preview.hidden =
    false;

  preview.style.display =
    "block";

  if (loader) {

    loader.innerText =
      `${file.name} ready to analyze`;
  }

  return true;
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

      renderFilePreview(file);
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

      renderFilePreview(file);
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
      "Please select invoice image"
    );

    return;
  }

  const file =
    fileInput.files[0];

  if (!renderFilePreview(file)) {
    return;
  }

  if (loader) {

    loader.innerText =
      "Uploading and analyzing invoice...";
  }

  const token =
    localStorage.getItem("token");

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
      await response.json();

    console.log(data);

    if (response.ok) {

      if (loader) {

        loader.innerText =
          "Invoice Uploaded Successfully";
      }

      // SHOW DETAILS
      if (details) {

        details.innerHTML = `

        <p>
          <strong>Merchant:</strong>
          ${data.merchantName}
        </p>

        <p>
          <strong>Date:</strong>
          ${new Date(data.date)
            .toLocaleDateString()}
        </p>

        <p>
          <strong>Total Amount:</strong>
          Rs. ${data.amount}
        </p>

        <p>
          <strong>GST:</strong>
          Rs. ${data.tax}
        </p>

        <p>
          <strong>Category:</strong>
          ${data.category}
        </p>

        <p>
          <strong>Status:</strong>
          Successfully Uploaded
        </p>
      `;
      }

      // SHOW RAW OCR TEXT
      if (rawText) {

        rawText.innerText =
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
      localStorage.getItem("token");

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
      await response.json();

    console.log(data);

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

  } catch (error) {

    console.log(error);
  }
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

  // PIE CHART
  new Chart(pie, {

    type: "doughnut",

    data: {

      labels:
        Object.keys(
          data.categoryBreakdown
        ),

      datasets: [{

        data:
          Object.values(
            data.categoryBreakdown
          ),

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
  new Chart(bar, {

    type: "bar",

    data: {

      labels:
        Object.keys(
          data.merchantBreakdown
        ),

      datasets: [{

        label: "Expenses",

        data:
          Object.values(
            data.merchantBreakdown
          ),

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

    if (
      getElement("totalSpent") &&
      getElement("totalGST") &&
      getElement("topCategory")
    ) {
      fetchDashboardData();
    }
  }
);
