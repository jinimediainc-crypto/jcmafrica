let rates = {};
let isSyncing = false;

const usdIn = document.getElementById('sync-usd');
const inrIn = document.getElementById('sync-inr');
const tzsIn = document.getElementById('sync-tzs');

async function fetchRates() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        rates = data.rates;
        
        document.getElementById('api-status').innerText = `🟢 Live Banking Feeds Operational`;
        calculateThreeWaySync('USD');
        applyCommodityDefaults(); // Fill realistic price on load
    } catch (error) {
        document.getElementById('api-status').innerText = '🔴 Fallback System Activated (Network Offline)';
        document.getElementById('api-status').style.color = '#ef4444';
        rates = { USD: 1, INR: 83.50, TZS: 2600.00 };
        calculateThreeWaySync('USD');
        applyCommodityDefaults();
    }
}

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

    if (originField !== 'USD') usdIn.value = baseUSDValue === 0 ? '' : baseUSDValue.toFixed(4);
    if (originField !== 'INR') inrIn.value = baseUSDValue === 0 ? '' : (baseUSDValue * rates.INR).toFixed(2);
    if (originField !== 'TZS') tzsIn.value = baseUSDValue === 0 ? '' : (baseUSDValue * rates.TZS).toFixed(2);

    isSyncing = false;
}

usdIn.addEventListener('input', () => calculateThreeWaySync('USD'));
inrIn.addEventListener('input', () => calculateThreeWaySync('INR'));
tzsIn.addEventListener('input', () => calculateThreeWaySync('TZS'));

// REAL WORLD DATA INJECTION
function applyCommodityDefaults() {
    if (!rates.INR) return;
    const selection = document.getElementById('cargo-commodity');
    const selectedOpt = selection.options[selection.selectedIndex];
    
    const baseUSD = parseFloat(selectedOpt.dataset.usd);
    const curr = document.getElementById('cargo-currency').value;
    
    // Auto-fill the input box with real-world equivalent metrics
    if (curr === 'USD') {
        document.getElementById('cargo-rate').value = baseUSD;
    } else if (curr === 'INR') {
        document.getElementById('cargo-rate').value = Math.round(baseUSD * rates.INR);
    }
}

function applyWeightDefaults() {
    const selection = document.getElementById('cargo-container');
    const weight = selection.options[selection.selectedIndex].dataset.weight;
    document.getElementById('cargo-weight').value = weight;
}


function executeTradeMatrix() {
    if (!rates.USD) return alert("System downloading exchange metrics. Standby.");

    const commodity = document.getElementById('cargo-commodity').value;
    const dutyPercentage = parseFloat(document.getElementById('cargo-commodity').options[document.getElementById('cargo-commodity').selectedIndex].dataset.duty);
    const weightTons = parseFloat(document.getElementById('cargo-weight').value) || 1; 
    const ratePerTon = parseFloat(document.getElementById('cargo-rate').value) || 0;
    const rateCurrency = document.getElementById('cargo-currency').value;
    
    const portFobUSD = parseFloat(document.getElementById('port-origin').value) || 0;
    const portDestUSD = parseFloat(document.getElementById('port-dest').value) || 0;
    const oceanFreightUSD = parseFloat(document.getElementById('shipping-freight').value) || 0;
    const corporateMargin = parseFloat(document.getElementById('business-margin').value) || 0;

    // 1. Base Valuation
    let totalBaseProductCostUSD = 0;
    const totalRawProductCostInput = weightTons * ratePerTon;

    if (rateCurrency === 'USD') {
        totalBaseProductCostUSD = totalRawProductCostInput;
    } else {
        totalBaseProductCostUSD = totalRawProductCostInput / rates.INR;
    }

    // 2. Freight/Duty Formulation
    const totalFOBValueUSD = totalBaseProductCostUSD + portFobUSD; 
    const totalCIFValueUSD = totalFOBValueUSD + oceanFreightUSD;
    const calculatedEACDutyUSD = totalCIFValueUSD * (dutyPercentage / 100);
    
    const totalLandedBreakEvenUSD = totalCIFValueUSD + portDestUSD + calculatedEACDutyUSD;
    const calculatedProfitUSD = totalLandedBreakEvenUSD * (corporateMargin / 100);
    const finalExportQuoteUSD = totalLandedBreakEvenUSD + calculatedProfitUSD;

    // 3. Unit Breakdown (Per MT and Per KG based on Final Price)
    const finalPricePerMT_USD = finalExportQuoteUSD / weightTons;
    const finalPricePerKG_USD = finalPricePerMT_USD / 1000;

    // 4. Render Engine
    function renderRow(usdValue, elementIdPrefix) {
        document.getElementById(`${elementIdPrefix}-usd`).innerText = `$${usdValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById(`${elementIdPrefix}-inr`).innerText = `₹${(usdValue * rates.INR).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById(`${elementIdPrefix}-tzs`).innerText = `${(usdValue * rates.TZS).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TZS`;
    }

    renderRow(totalBaseProductCostUSD, 'v-base');
    renderRow(portFobUSD, 'v-fob');
    renderRow(totalFOBValueUSD, 'v-totalfob');
    renderRow(oceanFreightUSD, 'v-frt');
    renderRow(totalCIFValueUSD, 'v-cif');
    renderRow(portDestUSD, 'v-af');
    renderRow(calculatedEACDutyUSD, 'v-tax');
    renderRow(calculatedProfitUSD, 'v-prof');
    renderRow(finalExportQuoteUSD, 'v-final');

    // Render Unit Prices
    renderRow(finalPricePerMT_USD, 'u-mt');
    renderRow(finalPricePerKG_USD, 'u-kg');

    document.getElementById('inv-desc-weight').innerText = weightTons;
    document.getElementById('inv-desc-rate').innerText = `${ratePerTon} ${rateCurrency}`;
    document.getElementById('inv-desc-duty').innerText = dutyPercentage;
    document.getElementById('inv-desc-margin').innerText = corporateMargin;

    // Set Timezones (IST & EAT)
    const now = new Date();
    const timeOpts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    const istTime = new Intl.DateTimeFormat('en-IN', { ...timeOpts, timeZone: 'Asia/Kolkata' }).format(now);
    const eatTime = new Intl.DateTimeFormat('en-KE', { ...timeOpts, timeZone: 'Africa/Dar_es_Salaam' }).format(now);
    
    document.getElementById('manifest-date').innerHTML = `
        <div style="margin-bottom: 5px;"><strong>IST:</strong> ${istTime}</div>
        <div><strong>EAT:</strong> ${eatTime}</div>
    `;

    document.getElementById('invoice-block').style.display = 'block';
    document.getElementById('pdf-btn').style.display = 'block';
    document.getElementById('invoice-block').scrollIntoView({ behavior: 'smooth' });
}

fetchRates();
