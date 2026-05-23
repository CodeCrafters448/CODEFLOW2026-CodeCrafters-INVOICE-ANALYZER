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
  const chartText = '#dbeafe';
  const chartGrid = 'rgba(148, 163, 184, 0.18)';

  if (!pie || !bar) {
    return;
  }

  if (!window.Chart) {
    drawFallbackCharts(pie, bar);
    return;
  }

  new Chart(pie, {
    type: 'doughnut',
    data: {
      labels: ['Food', 'Shopping', 'Travel', 'Utilities'],
      datasets: [{
        data: [45, 30, 15, 10],
        backgroundColor: ['#3b82f6', '#60a5fa', '#22c55e', '#f59e0b']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: chartText
          }
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
        backgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: chartText
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: chartGrid
          },
          ticks: {
            color: chartText
          }
        },
        x: {
          grid: {
            color: chartGrid
          },
          ticks: {
            color: chartText
          }
        }
      }
    }
  });
}

function drawFallbackCharts(pie, bar) {
  const pieContext = pie.getContext('2d');
  const barContext = bar.getContext('2d');
  const segments = [
    { label: 'Food', value: 45, color: '#3b82f6' },
    { label: 'Shopping', value: 30, color: '#60a5fa' },
    { label: 'Travel', value: 15, color: '#22c55e' },
    { label: 'Utilities', value: 10, color: '#f59e0b' }
  ];
  const bars = [
    { label: 'Amazon', value: 8000 },
    { label: 'Swiggy', value: 5000 },
    { label: 'Uber', value: 3000 },
    { label: 'Utility', value: 2200 }
  ];
  let start = -Math.PI / 2;

  pie.width = pie.clientWidth;
  pie.height = 320;
  bar.width = bar.clientWidth;
  bar.height = 320;

  segments.forEach((segment) => {
    const slice = (segment.value / 100) * Math.PI * 2;
    pieContext.beginPath();
    pieContext.moveTo(pie.width / 2, 150);
    pieContext.arc(pie.width / 2, 150, 110, start, start + slice);
    pieContext.closePath();
    pieContext.fillStyle = segment.color;
    pieContext.fill();
    start += slice;
  });

  pieContext.fillStyle = '#dbeafe';
  pieContext.font = '14px Arial';
  segments.forEach((segment, index) => {
    pieContext.fillText(`${segment.label}: ${segment.value}%`, 20, 280 + index * 18);
  });

  const max = Math.max(...bars.map((item) => item.value));
  const gap = 24;
  const width = (bar.width - gap * (bars.length + 1)) / bars.length;

  barContext.fillStyle = '#dbeafe';
  barContext.font = '13px Arial';

  bars.forEach((item, index) => {
    const height = (item.value / max) * 220;
    const x = gap + index * (width + gap);
    const y = 250 - height;

    barContext.fillStyle = '#3b82f6';
    barContext.fillRect(x, y, width, height);
    barContext.fillStyle = '#dbeafe';
    barContext.fillText(item.label, x, 278);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupUploadPreview();
  renderDashboardCharts();
});
