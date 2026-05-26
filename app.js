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
        handleCommodityChange();
    } catch (error) {
        document.getElementById('api-status').innerText = '🔴 Offline Mode Active';
        document.getElementById('api-status').style.color = '#ef4444';
        rates = { USD: 1, INR: 83.50, TZS: 2600.00 };
        calculateThreeWaySync('USD');
        handleCommodityChange();
    }
}

function calculateThreeWaySync(originField) {
    if (!rates.USD || isSyncing) return;
    isSyncing = true;
    let baseUSD = 0;
    if (originField === 'USD') baseUSD = parseFloat(usdIn.value) || 0;
    else if (originField === 'INR') baseUSD = (parseFloat(inrIn.value) || 0) / rates.INR;
    else if (originField === 'TZS') baseUSD = (parseFloat(tzsIn.value) || 0) / rates.TZS;

    if (originField !== 'USD') usdIn.value = baseUSD === 0 ? '' : baseUSD.toFixed(4);
    if (originField !== 'INR') inrIn.value = baseUSD === 0 ? '' : (baseUSD * rates.INR).toFixed(2);
    if (originField !== 'TZS') tzsIn.value = baseUSD === 0 ? '' : (baseUSD * rates.TZS).toFixed(2);
    isSyncing = false;
}

usdIn.addEventListener('input', () => calculateThreeWaySync('USD'));
inrIn.addEventListener('input', () => calculateThreeWaySync('INR'));
tzsIn.addEventListener('input', () => calculateThreeWaySync('TZS'));

function handleCommodityChange() {
    const sel = document.getElementById('cargo-commodity');
    const customNameInput = document.getElementById('custom-name');
    const opt = sel.options[sel.selectedIndex];

    if (sel.value === 'custom') {
        customNameInput.style.display = 'block';
    } else {
        customNameInput.style.display = 'none';
        document.getElementById('custom-duty').value = opt.dataset.duty;
        document.getElementById('cargo-buy-rate').value = opt.dataset.in;
        document.getElementById('cargo-sell-rate').value = opt.dataset.out;
    }
}

function executeProforma() {
    if (!rates.USD) return alert("System downloading metrics. Standby.");

    // Parse Data
    const sel = document.getElementById('cargo-commodity');
    const itemName = sel.value === 'custom' ? (document.getElementById('custom-name').value || 'Custom Cargo') : sel.options[sel.selectedIndex].text;
    const mt = parseFloat(document.getElementById('cargo-weight').value) || 1; 
    
    // Core Rates
    const buyUSD = parseFloat(document.getElementById('cargo-buy-rate').value) || 0;
    const sellUSD = parseFloat(document.getElementById('cargo-sell-rate').value) || 0;
    
    // Granular Costs
    const packUSD = parseFloat(document.getElementById('cost-pack').value) || 0;
    const chaUSD = parseFloat(document.getElementById('cost-cha').value) || 0;
    const miscUSD = parseFloat(document.getElementById('cost-misc').value) || 0;
    const originUSD = parseFloat(document.getElementById('cost-origin').value) || 0;
    const frtUSD = parseFloat(document.getElementById('cost-freight').value) || 0;
    const destUSD = parseFloat(document.getElementById('cost-dest').value) || 0;
    const dutyPct = parseFloat(document.getElementById('custom-duty').value) || 0;

    // --- INTERNAL MATH (The Real Costs) ---
    const totalBuyUSD = mt * buyUSD;
    const internalPrepUSD = packUSD + chaUSD + miscUSD;
    const trueFobCostUSD = totalBuyUSD + internalPrepUSD + originUSD;
    const trueCifCostUSD = trueFobCostUSD + frtUSD;

    // --- CLIENT MATH (What they see on the quote based on your SELL price) ---
    // The client is quoted a final base commodity price that silently absorbs your profit
    const clientQuotedBaseUSD = (mt * sellUSD) - originUSD; 
    const clientFobUSD = clientQuotedBaseUSD + originUSD;
    const clientCifUSD = clientFobUSD + frtUSD;
    const clientDutyUSD = clientCifUSD * (dutyPct / 100);

    // Profit Calculation
    const netProfitUSD = clientCifUSD - trueCifCostUSD; 
    const roi = (netProfitUSD / trueCifCostUSD) * 100;

    // Formatting Helper
    const formatUSD = val => `$${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const formatINR = val => `₹${(val * rates.INR).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
    const formatTZS = val => `${(val * rates.TZS).toLocaleString('en-US', {maximumFractionDigits: 0})} TZS`;

    function render(val, prefix) {
        document.getElementById(`${prefix}-usd`).innerText = formatUSD(val);
        document.getElementById(`${prefix}-inr`).innerText = formatINR(val);
        document.getElementById(`${prefix}-tzs`).innerText = formatTZS(val);
    }

    // Populate UI
    document.getElementById('out-item-name').innerText = itemName;
    document.getElementById('out-qty').innerText = mt;
    document.getElementById('out-duty-pct').innerText = dutyPct;

    // Internal Rows
    render(totalBuyUSD, 'v-buy');
    render(internalPrepUSD, 'v-prep');
    render(trueFobCostUSD, 'v-truefob');

    // Client Rows
    render(clientQuotedBaseUSD, 'v-quote-base');
    render(originUSD, 'v-origin');
    render(clientFobUSD, 'v-fob');
    render(frtUSD, 'v-frt');
    render(clientCifUSD, 'v-cif');
    render(destUSD, 'v-dest');
    render(clientDutyUSD, 'v-duty');

    // Banners
    document.getElementById('out-revenue').innerText = formatUSD(clientCifUSD);
    document.getElementById('out-profit').innerText = formatUSD(netProfitUSD);
    document.getElementById('out-roi').innerText = `ROI: ${roi.toFixed(1)}%`;

    const profitBox = document.getElementById('profit-container');
    if (netProfitUSD >= 0) {
        profitBox.style.background = 'var(--success)';
        document.getElementById('out-profit').innerText = `+${formatUSD(netProfitUSD)}`;
    } else {
        profitBox.style.background = 'var(--danger)';
    }

    // Date
    document.getElementById('print-date').innerText = `Date: ${new Date().toLocaleDateString('en-GB')} | Valid for 7 Days`;

    // Show Block
    document.getElementById('invoice-block').style.display = 'block';
    document.getElementById('pdf-btn').style.display = 'block';
    document.getElementById('invoice-block').scrollIntoView({ behavior: 'smooth' });
}

fetchRates();
