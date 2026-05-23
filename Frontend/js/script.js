let liveExpenseChart;

function getElement(id) {
  return document.getElementById(id);
}

function money(value) {
  if (!value) {
    return 'Not Found';
  }

  return `Rs. ${value}`;
}

function detectCategory(text) {
  const content = text.toLowerCase();

  if (content.includes('restaurant') || content.includes('cafe') || content.includes('swiggy') || content.includes('food')) {
    return 'Food';
  }

  if (content.includes('uber') || content.includes('ola') || content.includes('travel') || content.includes('fuel')) {
    return 'Travel';
  }

  if (content.includes('amazon') || content.includes('shopping') || content.includes('store')) {
    return 'Shopping';
  }

  if (content.includes('electricity') || content.includes('utility') || content.includes('bill')) {
    return 'Utilities';
  }

  return 'General';
}

function extractInvoiceData(text) {
  const amountMatches = text.match(/(?:rs\.?|inr)?\s*\d{1,3}(?:,\d{3})*(?:[.]\d{2})|\d+[.]\d{2}/gi) || [];
  const dateMatch = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/);
  const gstMatch = text.match(/(?:gst|tax)[^\d]*(\d{1,3}(?:,\d{3})*(?:[.]\d{2})?)/i);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const merchant = lines[0] || 'Unknown Merchant';
  const amount = amountMatches.length ? amountMatches[amountMatches.length - 1].replace(/rs\.?|inr|\s/gi, '') : '';

  return {
    merchant,
    date: dateMatch ? dateMatch[0] : 'Not Found',
    amount,
    gst: gstMatch ? gstMatch[1] : 'Not Found',
    category: detectCategory(text)
  };
}

function renderDetails(data) {
  const details = getElement('invoiceDetails');

  if (!details) {
    return;
  }

  details.innerHTML = `
    <p><strong>Merchant:</strong> ${data.merchant}</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Total Amount:</strong> ${money(data.amount)}</p>
    <p><strong>GST:</strong> ${data.gst === 'Not Found' ? data.gst : money(data.gst)}</p>
    <p><strong>Category:</strong> ${data.category}</p>
    <p><strong>Status:</strong> Successfully Analyzed</p>
  `;
}

function setupUploadPreview() {
  const input = getElement('invoiceFile');
  const preview = getElement('preview');
  const dropZone = getElement('dropZone');

  if (!input || !preview) {
    return;
  }

  input.addEventListener('change', () => {
    if (input.files[0]) {
      preview.src = URL.createObjectURL(input.files[0]);
    }
  });

  if (!dropZone) {
    return;
  }

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files[0];

    if (file) {
      input.files = event.dataTransfer.files;
      preview.src = URL.createObjectURL(file);
    }
  });
}

async function analyzeInvoice() {
  const fileInput = getElement('invoiceFile');
  const preview = getElement('preview');
  const loader = getElement('loader');
  const rawText = getElement('rawText');

  if (!fileInput || !fileInput.files[0]) {
    alert('Please upload an invoice image.');
    return;
  }

  const file = fileInput.files[0];
  preview.src = URL.createObjectURL(file);
  loader.textContent = 'Processing OCR...';

  try {
    if (!window.Tesseract) {
      throw new Error('Tesseract.js is not available. Check your internet connection and try again.');
    }

    const result = await Tesseract.recognize(file, 'eng');
    const text = result.data.text.trim();
    const invoiceData = extractInvoiceData(text);

    rawText.textContent = text || 'No text detected.';
    renderDetails(invoiceData);
    loader.textContent = 'Analysis completed';
  } catch (error) {
    loader.textContent = error.message;
  }
}

function renderDashboardCharts() {
  const pie = getElement('pieChart');
  const bar = getElement('barChart');

  if (!pie || !bar || !window.Chart) {
    return;
  }

  new Chart(pie, {
    type: 'doughnut',
    data: {
      labels: ['Food', 'Shopping', 'Travel', 'Utilities'],
      datasets: [{
        data: [45, 30, 15, 10],
        backgroundColor: ['#2563eb', '#f97316', '#0f766e', '#64748b']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });

  new Chart(bar, {
    type: 'bar',
    data: {
      labels: ['Amazon', 'Swiggy', 'Uber', 'Utility Co.'],
      datasets: [{
        label: 'Expenses',
        data: [8000, 5000, 3000, 2200],
        backgroundColor: '#2563eb'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupUploadPreview();
  renderDashboardCharts();
});
