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
        applyCommodityDefaults(); 
    } catch (error) {
        document.getElementById('api-status').innerText = '🔴 Offline Mode Active';
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

    if (originField === 'USD') baseUSDValue = parseFloat(usdIn.value) || 0;
    else if (originField === 'INR') baseUSDValue = (parseFloat(inrIn.value) || 0) / rates.INR;
    else if (originField === 'TZS') baseUSDValue = (parseFloat(tzsIn.value) || 0) / rates.TZS;

    if (originField !== 'USD') usdIn.value = baseUSDValue === 0 ? '' : baseUSDValue.toFixed(4);
    if (originField !== 'INR') inrIn.value = baseUSDValue === 0 ? '' : (baseUSDValue * rates.INR).toFixed(2);
    if (originField !== 'TZS') tzsIn.value = baseUSDValue === 0 ? '' : (baseUSDValue * rates.TZS).toFixed(2);
    isSyncing = false;
}

usdIn.addEventListener('input', () => calculateThreeWaySync('USD'));
inrIn.addEventListener('input', () => calculateThreeWaySync('INR'));
tzsIn.addEventListener('input', () => calculateThreeWaySync('TZS'));

function applyCommodityDefaults() {
    if (!rates.INR) return;
    const selection = document.getElementById('cargo-commodity');
    const selectedOpt = selection.options[selection.selectedIndex];
    
    // Set Duty
    document.getElementById('custom-duty').value = selectedOpt.dataset.duty;

    // Set Buy Rate
    const buyUSD = parseFloat(selectedOpt.dataset.in);
    const buyCurr = document.getElementById('cargo-currency').value;
    document.getElementById('cargo-buy-rate').value = buyCurr === 'USD' ? buyUSD : Math.round(buyUSD * rates.INR);

    // Set Sell Rate
    const sellUSD = parseFloat(selectedOpt.dataset.out);
    const sellCurr = document.getElementById('sell-currency').value;
    document.getElementById('cargo-sell-rate').value = sellCurr === 'USD' ? sellUSD : Math.round(sellUSD * rates.TZS);
}

function applyWeightDefaults() {
    const selection = document.getElementById('cargo-container');
    document.getElementById('cargo-weight').value = selection.options[selection.selectedIndex].dataset.weight;
}

function executeArbitrageMatrix() {
    if (!rates.USD) return alert("System downloading metrics. Standby.");

    // Inputs
    const weightTons = parseFloat(document.getElementById('cargo-weight').value) || 1; 
    const buyRate = parseFloat(document.getElementById('cargo-buy-rate').value) || 0;
    const buyCurr = document.getElementById('cargo-currency').value;
    const sellRate = parseFloat(document.getElementById('cargo-sell-rate').value) || 0;
    const sellCurr = document.getElementById('sell-currency').value;
    const dutyPercentage = parseFloat(document.getElementById('custom-duty').value) || 0;
    
    const portFobUSD = parseFloat(document.getElementById('port-origin').value) || 0;
    const portDestUSD = parseFloat(document.getElementById('port-dest').value) || 0;
    const oceanFreightUSD = parseFloat(document.getElementById('shipping-freight').value) || 0;

    // Normalize everything to USD for math
    const buyPriceUSD = buyCurr === 'USD' ? buyRate : buyRate / rates.INR;
    const sellPriceUSD = sellCurr === 'USD' ? sellRate : sellRate / rates.TZS;

    // Costs calculations
    const totalBaseCostUSD = weightTons * buyPriceUSD;
    const totalCIFValueUSD = totalBaseCostUSD + portFobUSD + oceanFreightUSD;
    const dutyUSD = totalCIFValueUSD * (dutyPercentage / 100);
    const totalLandedCostUSD = totalCIFValueUSD + portDestUSD + dutyUSD;

    // Revenue calculations
    const totalRevenueUSD = weightTons * sellPriceUSD;
    const netProfitUSD = totalRevenueUSD - totalLandedCostUSD;
    const roiPercentage = (netProfitUSD / totalLandedCostUSD) * 100;

    // Formatting Helpers
    const formatUSD = val => `$${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const formatINR = val => `₹${(val * rates.INR).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
    const formatTZS = val => `${(val * rates.TZS).toLocaleString('en-US', {maximumFractionDigits: 0})} TZS`;

    function renderRow(usdValue, prefix) {
        document.getElementById(`${prefix}-usd`).innerText = formatUSD(usdValue);
        document.getElementById(`${prefix}-inr`).innerText = formatINR(usdValue);
        document.getElementById(`${prefix}-tzs`).innerText = formatTZS(usdValue);
    }

    // Populate Table
    renderRow(totalBaseCostUSD, 'v-base');
    renderRow(portFobUSD, 'v-fob');
    renderRow(oceanFreightUSD, 'v-frt');
    renderRow(totalCIFValueUSD, 'v-cif');
    document.getElementById('out-duty-pct').innerText = dutyPercentage;
    renderRow(dutyUSD, 'v-tax');
    renderRow(portDestUSD, 'v-af');
    renderRow(totalLandedCostUSD, 'v-total-cost');

    // Populate Profit/Revenue Banners
    document.getElementById('out-revenue').innerText = formatUSD(totalRevenueUSD);
    document.getElementById('out-revenue-sub').innerText = `${formatINR(totalRevenueUSD)} | ${formatTZS(totalRevenueUSD)}`;
    
    document.getElementById('out-profit').innerText = formatUSD(netProfitUSD);
    document.getElementById('out-roi').innerText = `ROI: ${roiPercentage.toFixed(1)}%`;

    // Dynamic color styling for Profit Box
    const profitBox = document.getElementById('profit-container');
    if (netProfitUSD >= 0) {
        profitBox.style.background = 'var(--success)';
        document.getElementById('out-profit').innerText = `+${formatUSD(netProfitUSD)}`;
    } else {
        profitBox.style.background = 'var(--danger)';
    }

    // Timestamps
    const now = new Date();
    const timeOpts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    const istTime = new Intl.DateTimeFormat('en-IN', { ...timeOpts, timeZone: 'Asia/Kolkata' }).format(now);
    const eatTime = new Intl.DateTimeFormat('en-KE', { ...timeOpts, timeZone: 'Africa/Dar_es_Salaam' }).format(now);
    
    document.getElementById('manifest-date').innerHTML = `Generated: ${istTime} (IST) | ${eatTime} (EAT)`;

    // Reveal UI
    document.getElementById('invoice-block').style.display = 'block';
    document.getElementById('pdf-btn').style.display = 'block';
    document.getElementById('invoice-block').scrollIntoView({ behavior: 'smooth' });
}

fetchRates();
