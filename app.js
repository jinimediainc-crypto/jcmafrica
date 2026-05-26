let rates = {};

// 1. Fetch Currency Rates (Free API, No Key needed for base endpoint)
async function fetchRates() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        rates = data.rates;
        document.getElementById('api-status').innerText = `Live rates loaded (Base: USD). Last updated: ${data.time_last_update_utc.substring(0, 16)}`;
        calculateConversion(); // Trigger initial calc
    } catch (error) {
        document.getElementById('api-status').innerText = 'Offline mode or API error.';
        document.getElementById('api-status').style.color = 'red';
    }
}

// 2. Forward/Reverse Converter Logic
function calculateConversion() {
    if (!rates.USD) return;
    
    const amount = parseFloat(document.getElementById('conv-amount').value) || 0;
    const from = document.getElementById('conv-from').value;
    const to = document.getElementById('conv-to').value;

    // Convert 'From' to USD, then USD to 'To'
    const amountInUSD = amount / rates[from];
    const finalAmount = amountInUSD * rates[to];

    document.getElementById('conv-result').innerText = `${finalAmount.toFixed(2)} ${to}`;
}

// 3. Export Calculator Logic
function calculateExport() {
    if (!rates.USD) {
        alert("Exchange rates not loaded yet.");
        return;
    }

    const baseCost = parseFloat(document.getElementById('exp-base').value) || 0;
    const shipping = parseFloat(document.getElementById('exp-shipping').value) || 0;
    const margin = parseFloat(document.getElementById('exp-margin').value) || 0;
    
    const originCurr = document.getElementById('exp-origin').value;
    const targetCurr = document.getElementById('exp-target').value;

    // Math: Total Cost in origin currency
    const totalCostOrigin = baseCost + shipping;
    // Add margin
    const priceWithMarginOrigin = totalCostOrigin + (totalCostOrigin * (margin / 100));

    // Currency Conversion
    const amountInUSD = priceWithMarginOrigin / rates[originCurr];
    const finalExportPrice = amountInUSD * rates[targetCurr];

    document.getElementById('exp-result').innerText = `Quote: ${finalExportPrice.toFixed(2)} ${targetCurr}`;
}

// Event Listeners for auto-updating basic converter
document.getElementById('conv-amount').addEventListener('input', calculateConversion);
document.getElementById('conv-from').addEventListener('change', calculateConversion);
document.getElementById('conv-to').addEventListener('change', calculateConversion);

// Initialize App
fetchRates();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker Registered');
    });
}
