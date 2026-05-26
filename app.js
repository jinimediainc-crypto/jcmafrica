let rates = {};

// 1. Fetch Live Rates
async function fetchRates() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        rates = data.rates;
        
        document.getElementById('api-status').innerText = `🟢 Live Rates Active | Last Update: ${data.time_last_update_utc.substring(0, 16)}`;
        
        // Trigger initial sync based on USD value
        syncCurrencies('USD');
    } catch (error) {
        document.getElementById('api-status').innerText = '🔴 Offline Mode: Showing cached rates if available.';
        document.getElementById('api-status').style.color = '#dc3545';
    }
}

// 2. 3-Way Currency Synchronizer
const usdInput = document.getElementById('sync-usd');
const inrInput = document.getElementById('sync-inr');
const tzsInput = document.getElementById('sync-tzs');

function syncCurrencies(source) {
    if (!rates.USD) return; // Ensure API loaded

    let usdVal = 0;

    // Convert whatever the user typed into USD first
    if (source === 'USD') {
        usdVal = parseFloat(usdInput.value) || 0;
    } else if (source === 'INR') {
        usdVal = (parseFloat(inrInput.value) || 0) / rates.INR;
    } else if (source === 'TZS') {
        usdVal = (parseFloat(tzsInput.value) || 0) / rates.TZS;
    }

    // Update the other two inputs based on the USD base
    if (source !== 'USD') usdInput.value = usdVal.toFixed(2);
    if (source !== 'INR') inrInput.value = (usdVal * rates.INR).toFixed(2);
    if (source !== 'TZS') tzsInput.value = (usdVal * rates.TZS).toFixed(2);
}

// Attach listeners so typing in any box updates the others immediately
usdInput.addEventListener('input', () => syncCurrencies('USD'));
inrInput.addEventListener('input', () => syncCurrencies('INR'));
tzsInput.addEventListener('input', () => syncCurrencies('TZS'));


// 3. Export Duty & Logistics Engine
function calculateExportMatrix() {
    if (!rates.USD) {
        alert("Please wait for exchange rates to load.");
        return;
    }

    // Get Inputs
    const rawVal = parseFloat(document.getElementById('exp-val').value) || 0;
    const inputCurr = document.getElementById('exp-curr').value;
    const dutyRate = parseFloat(document.getElementById('exp-product').value) || 0;
    
    // Get Port/Freight Estimates (Values stored in USD for standardization)
    const originHandlingUSD = parseFloat(document.getElementById('exp-origin').value) || 0;
    const destHandlingUSD = parseFloat(document.getElementById('exp-dest').value) || 0;
    const freightUSD = parseFloat(document.getElementById('exp-freight').value) || 0;

    // Normalize Cargo Value to USD
    const cargoValueUSD = inputCurr === 'USD' ? rawVal : rawVal / rates[inputCurr];

    // Math: Cost, Insurance, Freight (CIF)
    const cifValueUSD = cargoValueUSD + originHandlingUSD + freightUSD;

    // Math: Duty Calculations (EAC CET Duty is calculated on the CIF Value)
    const importDutyUSD = cifValueUSD * (dutyRate / 100);

    // Math: Total Landed Cost
    const totalLandedUSD = cifValueUSD + destHandlingUSD + importDutyUSD;

    // Render Data to UI
    document.getElementById('out-fob').innerText = `$${cargoValueUSD.toFixed(2)}`;
    document.getElementById('out-origin-fees').innerText = `$${originHandlingUSD.toFixed(2)}`;
    document.getElementById('out-freight').innerText = `$${freightUSD.toFixed(2)}`;
    
    document.getElementById('out-cif').innerText = `$${cifValueUSD.toFixed(2)}`;
    
    document.getElementById('out-dest-fees').innerText = `$${destHandlingUSD.toFixed(2)}`;
    document.getElementById('out-duty').innerText = `$${importDutyUSD.toFixed(2)} (${dutyRate}%)`;
    
    document.getElementById('out-total').innerText = `$${totalLandedUSD.toFixed(2)}`;

    // Show the breakdown panel
    document.getElementById('exp-breakdown').style.display = 'block';
}

// Initialize App
fetchRates();
