let rates = {};
let isSyncing = false; // Flag to prevent circular calculation events loops

// UI Handles for 3-Way Sync Inputs
const usdIn = document.getElementById('sync-usd');
const inrIn = document.getElementById('sync-inr');
const tzsIn = document.getElementById('sync-tzs');

async function fetchRates() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        rates = data.rates;
        
        document.getElementById('api-status').innerText = `🟢 Live Banking Feeds Operational | Rates Fresh (USD Base)`;
        
        // Populate system based on initial 1 USD value
        calculateThreeWaySync('USD');
    } catch (error) {
        document.getElementById('api-status').innerText = '🔴 Fallback System Activated (Network Offline)';
        document.getElementById('api-status').style.color = '#ef4444';
        // Emergency standard hardware fallback parameters
        rates = { USD: 1, INR: 83.50, TZS: 2600.00 };
        calculateThreeWaySync('USD');
    }
}

// 3-Way Interactive Realtime Synchronizer (Safe Multi-Directional Data flow)
function calculateThreeWaySync(originField) {
    if (!rates.USD || isSyncing) return;
    isSyncing = true;

    let baseUSDValue = 0;

    if (originField === 'USD') {
        baseUSDValue = parseFloat(usdIn.value) || 0;
    } else if (originField === 'INR') {
        baseUSDValue = (parseFloat(inrIn.value) || 0) / rates.INR;
    } else if (originField === 'TZS') {
        baseUSDValue = (parseFloat(tzsIn.value) || 0) / rates.TZS;
    }

    // Safely shift values down the pipeline to secondary fields
    if (originField !== 'USD') usdIn.value = baseUSDValue === 0 ? '' : baseUSDValue.toFixed(4);
    if (originField !== 'INR') inrIn.value = baseUSDValue === 0 ? '' : (baseUSDValue * rates.INR).toFixed(2);
    if (originField !== 'TZS') tzsIn.value = baseUSDValue === 0 ? '' : (baseUSDValue * rates.TZS).toFixed(2);

    isSyncing = false;
}

// Event hooks to watch typing in cross-currency blocks
usdIn.addEventListener('input', () => calculateThreeWaySync('USD'));
inrIn.addEventListener('input', () => calculateThreeWaySync('INR'));
tzsIn.addEventListener('input', () => calculateThreeWaySync('INR')); // Using key bindings safely
inrIn.oninput = () => calculateThreeWaySync('INR');
tzsIn.oninput = () => calculateThreeWaySync('TZS');

// Auto Adjustments based on commodity profiles selected
function applyCommodityDefaults() {
    const selection = document.getElementById('cargo-commodity');
    const selectedOpt = selection.options[selection.selectedIndex];
    // Can auto calculate custom base adjustments here if required in scaling versions
}

// Primary Commercial Matrix Logic Controller
function executeTradeMatrix() {
    if (!rates.USD) return alert("System database downloading core exchange metrics. Standby.");

    // Extract raw payload data
    const commodity = document.getElementById('cargo-commodity').value;
    const dutyPercentage = parseFloat(document.getElementById('cargo-commodity').options[document.getElementById('cargo-commodity').selectedIndex].dataset.duty);
    const weightTons = parseFloat(document.getElementById('cargo-weight').value) || 0;
    const ratePerTon = parseFloat(document.getElementById('cargo-rate').value) || 0;
    const rateCurrency = document.getElementById('cargo-currency').value;
    
    const portFobUSD = parseFloat(document.getElementById('port-origin').value) || 0;
    const portDestUSD = parseFloat(document.getElementById('port-dest').value) || 0;
    const oceanFreightUSD = parseFloat(document.getElementById('shipping-freight').value) || 0;
    const corporateMargin = parseFloat(document.getElementById('business-margin').value) || 0;

    // 1. Calculate Base Product Valuation Architecture
    let totalBaseProductCostUSD = 0;
    const totalRawProductCostInput = weightTons * ratePerTon;

    if (rateCurrency === 'USD') {
        totalBaseProductCostUSD = totalRawProductCostInput;
    } else {
        totalBaseProductCostUSD = totalRawProductCostInput / rates.INR;
    }

    // 2. Multi-tier Freight/Duty Formulation Engine
    const totalFOBValueUSD = totalBaseProductCostUSD + portFobUSD; 
    const totalCIFValueUSD = totalFOBValueUSD + oceanFreightUSD; // Cost + Freight + Base clear
    const calculatedEACDutyUSD = totalCIFValueUSD * (dutyPercentage / 100);
    
    // Absolute Landed Break-even Point 
    const totalLandedBreakEvenUSD = totalCIFValueUSD + portDestUSD + calculatedEACDutyUSD;
    
    // Profit additions
    const calculatedProfitUSD = totalLandedBreakEvenUSD * (corporateMargin / 100);
    const finalExportQuoteUSD = totalLandedBreakEvenUSD + calculatedProfitUSD;

    // 3. Document Matrix Transformation Function
    function renderRow(usdValue, elementIdPrefix) {
        document.getElementById(`${elementIdPrefix}-usd`).innerText = `$${usdValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById(`${elementIdPrefix}-inr`).innerText = `₹${(usdValue * rates.INR).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById(`${elementIdPrefix}-tzs`).innerText = `${(usdValue * rates.TZS).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TZS`;
    }

    // Render exact ledger allocations
    renderRow(totalBaseProductCostUSD, 'v-base');
    renderRow(portFobUSD, 'v-fob');
    renderRow(totalFOBValueUSD, 'v-totalfob');
    renderRow(oceanFreightUSD, 'v-frt');
    renderRow(totalCIFValueUSD, 'v-cif');
    renderRow(portDestUSD, 'v-af');
    renderRow(calculatedEACDutyUSD, 'v-tax');
    renderRow(totalLandedBreakEvenUSD, 'v-be');
    renderRow(calculatedProfitUSD, 'v-prof');
    renderRow(finalExportQuoteUSD, 'v-final');

    // Update metadata descriptions inside sheet
    document.getElementById('inv-desc-weight').innerText = weightTons;
    document.getElementById('inv-desc-rate').innerText = `${ratePerTon} ${rateCurrency}`;
    document.getElementById('inv-desc-duty').innerText = dutyPercentage;
    document.getElementById('inv-desc-margin').innerText = corporateMargin;
    document.getElementById('manifest-date').innerText = `Generated on: ${new Date().toUTCString()}`;

    // Reveal UI Output components
    document.getElementById('invoice-block').style.display = 'block';
    document.getElementById('pdf-btn').style.display = 'block';
    
    // Smooth scroll down to invoice display target window
    document.getElementById('invoice-block').scrollIntoView({ behavior: 'smooth' });
}

// Fire system initialization scripts
fetchRates();
