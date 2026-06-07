// ===== ETF Configuration =====
const TASE_URL = (id) => `https://www.tase.co.il/he/market_data/security/${id}/major_data`;

const ETF_CONFIG = [
  {
    id: '1159250',
    name: 'iShares Core S&P 500',
    shortName: 'S&P 500',
    target: 0.60,
    color: 'var(--color-sp500)',
    colorHex: '#6366f1',
    taseUrl: TASE_URL('1159250'),
  },
  {
    id: '1159094',
    name: 'iShares MSCI Europe',
    shortName: 'Europe',
    target: 0.25,
    color: 'var(--color-europe)',
    colorHex: '#06b6d4',
    taseUrl: TASE_URL('1159094'),
  },
  {
    id: '1159169',
    name: 'iShares Core MSCI EM',
    shortName: 'Emerging',
    target: 0.15,
    color: 'var(--color-em)',
    colorHex: '#f59e0b',
    taseUrl: TASE_URL('1159169'),
  },
];

const FEE_RESERVE = 100; // NIS

// ===== State =====
const state = {
  prices: {},   // ETF id -> price per unit
  holdings: {}, // ETF id -> number of units
  deposit: 0,
  history: [],  // array of history records
  currentCalculation: null, // latest calculation results
};

// ===== DOM Setup =====
async function init() {
  renderPriceInputs();
  renderHoldingInputs();
  setupDepositInput();
  setupCalculateButton();
  setupHistoryActions();
  await loadSavedState();
  renderHistory();
  
  // Initialize and schedule market status clock
  updateMarketStatus();
  setInterval(updateMarketStatus, 1000);
}

function setupHistoryActions() {
  const btn = document.getElementById('btn-save-history');
  if (btn) btn.addEventListener('click', saveToHistory);

  const historyList = document.getElementById('history-list');
  if (historyList) {
    historyList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const id = deleteBtn.dataset.deleteId;
        deleteHistoryRecord(id);
      }
    });
  }
}

// ===== Render Price Inputs =====
function renderPriceInputs() {
  const container = document.getElementById('etf-prices');
  container.innerHTML = ETF_CONFIG.map(etf => `
    <div class="etf-row">
      <div class="etf-color-dot" style="color: ${etf.color}; background: ${etf.color}"></div>
      <div class="etf-info">
        <div class="etf-name">${etf.name}</div>
        <div class="etf-meta">
          <a href="${etf.taseUrl}" target="_blank" rel="noopener noreferrer" class="tase-link" title="View on TASE">
            <svg class="tase-link-icon" width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5m0 0v5m0-5L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            TASE #${etf.id}
          </a>
          <span>•</span>
          <span class="etf-target">${(etf.target * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div class="input-group">
        <span class="input-prefix">₪</span>
        <input
          type="number"
          id="price-${etf.id}"
          class="input-field"
          placeholder="0.00"
          min="0"
          step="0.01"
          data-etf-id="${etf.id}"
          data-input-type="price"
          aria-label="Price per unit for ${etf.name}"
        />
      </div>
    </div>
  `).join('');

  // Add event listeners
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', handlePriceInput);
    input.addEventListener('change', handlePriceInput);
  });
}

// ===== Render Holding Inputs =====
function renderHoldingInputs() {
  const container = document.getElementById('etf-holdings');
  container.innerHTML = ETF_CONFIG.map(etf => `
    <div class="etf-row">
      <div class="etf-color-dot" style="color: ${etf.color}; background: ${etf.color}"></div>
      <div class="etf-info">
        <div class="etf-name">${etf.shortName}</div>
        <div class="etf-meta">
          <span id="holding-value-${etf.id}" class="etf-holding-value">₪0</span>
        </div>
      </div>
      <div class="input-group">
        <input
          type="number"
          id="holding-${etf.id}"
          class="input-field input-field-units"
          placeholder="0"
          min="0"
          step="1"
          data-etf-id="${etf.id}"
          data-input-type="holding"
          aria-label="Number of units for ${etf.name}"
        />
        <span class="input-suffix">units</span>
      </div>
    </div>
  `).join('');

  // Add event listeners
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', handleHoldingInput);
    input.addEventListener('change', handleHoldingInput);
  });
}

// ===== Setup Deposit Input =====
function setupDepositInput() {
  const depositInput = document.getElementById('deposit-amount');
  depositInput.addEventListener('input', handleDepositInput);
  depositInput.addEventListener('change', handleDepositInput);
}

// ===== Setup Calculate Button =====
function setupCalculateButton() {
  const btn = document.getElementById('btn-calculate');
  btn.addEventListener('click', calculate);
}

// ===== Input Handlers =====
function handlePriceInput(e) {
  const id = e.target.dataset.etfId;
  const value = parseFloat(e.target.value) || 0;
  state.prices[id] = value;

  // Update holding value display
  updateHoldingValue(id);
  updateButtonState();
  updateDashboard();
  saveState();
}

function handleHoldingInput(e) {
  const id = e.target.dataset.etfId;
  const value = parseInt(e.target.value) || 0;
  state.holdings[id] = value;

  // Update holding value display
  updateHoldingValue(id);
  updateButtonState();
  updateDashboard();
  saveState();
}

function handleDepositInput(e) {
  const value = parseFloat(e.target.value) || 0;
  state.deposit = value;

  const available = Math.max(0, value - FEE_RESERVE);
  document.getElementById('reserved-fees').textContent = `₪${FEE_RESERVE.toLocaleString()}`;
  document.getElementById('available-invest').textContent = `₪${available.toLocaleString()}`;

  updateButtonState();
  saveState();
}

function updateHoldingValue(id) {
  const price = state.prices[id] || 0;
  const units = state.holdings[id] || 0;
  const value = price * units;
  const el = document.getElementById(`holding-value-${id}`);
  if (el) {
    el.textContent = value > 0 ? `₪${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₪0';
  }
}

// ===== Button State =====
function updateButtonState() {
  const btn = document.getElementById('btn-calculate');
  const hasPrices = ETF_CONFIG.every(etf => (state.prices[etf.id] || 0) > 0);
  const hasDeposit = state.deposit > FEE_RESERVE;

  btn.disabled = !(hasPrices && hasDeposit);
}

// ===== CALCULATION ENGINE =====
function calculate() {
  const availableCash = Math.max(0, state.deposit - FEE_RESERVE);

  // Current portfolio values
  const currentValues = ETF_CONFIG.map(etf => ({
    ...etf,
    units: state.holdings[etf.id] || 0,
    price: state.prices[etf.id] || 0,
    value: (state.holdings[etf.id] || 0) * (state.prices[etf.id] || 0),
  }));

  const currentTotal = currentValues.reduce((sum, e) => sum + e.value, 0);
  const newTotal = currentTotal + availableCash;

  // Target values after adding new money
  const targetValues = currentValues.map(etf => ({
    ...etf,
    targetValue: newTotal * etf.target,
    deficit: (newTotal * etf.target) - etf.value,
  }));

  // Greedy allocation: buy whole units prioritizing largest deficits first
  let remainingCash = availableCash;
  const allocation = targetValues.map(etf => ({
    ...etf,
    buyUnits: 0,
    buyCost: 0,
  }));

  // Iteratively buy 1 unit of the ETF with the largest remaining deficit
  let madeProgress = true;
  while (remainingCash > 0 && madeProgress) {
    madeProgress = false;

    // Find ETF with largest deficit relative to target that we can afford
    let bestIdx = -1;
    let bestDeficit = -Infinity;

    for (let i = 0; i < allocation.length; i++) {
      const etf = allocation[i];
      const currentVal = etf.value + (etf.buyUnits * etf.price);
      const deficit = (newTotal * etf.target) - currentVal;

      if (deficit > 0 && etf.price <= remainingCash && deficit > bestDeficit) {
        bestDeficit = deficit;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      allocation[bestIdx].buyUnits += 1;
      allocation[bestIdx].buyCost += allocation[bestIdx].price;
      remainingCash -= allocation[bestIdx].price;
      madeProgress = true;
    }
  }

  // Calculate final state
  const results = allocation.map(etf => {
    const newUnits = etf.units + etf.buyUnits;
    const newValue = newUnits * etf.price;
    const actualPct = newTotal > 0 ? (newValue / (newTotal - remainingCash)) * 100 : 0;
    const deviation = actualPct - (etf.target * 100);

    return {
      ...etf,
      newUnits,
      newValue,
      actualPct,
      deviation,
    };
  });

  const totalInvested = availableCash - remainingCash;
  const leftover = remainingCash;

  state.currentCalculation = {
    date: new Date().toISOString(),
    totalDeposit: state.deposit,
    totalInvested,
    leftover,
    prices: { ...state.prices },
    results: results.map(r => ({
      id: r.id,
      shortName: r.shortName,
      color: r.color,
      buyUnits: r.buyUnits,
      buyCost: r.buyCost,
      newUnits: r.newUnits,
      price: r.price
    }))
  };

  renderResults(results, totalInvested, leftover, newTotal);
}

// ===== RENDER RESULTS =====
function renderResults(results, totalInvested, leftover, portfolioTotal) {
  const section = document.getElementById('section-results');
  section.classList.remove('hidden');
  section.classList.add('visible');

  // Update subtitle
  const subtitle = document.getElementById('results-subtitle');
  subtitle.textContent = leftover > 0
    ? `Invest ₪${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })} • ₪${leftover.toLocaleString(undefined, { maximumFractionDigits: 2 })} remainder (can't buy a full unit)`
    : `Invest ₪${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })} across your 3 ETFs`;

  // Render table
  const tbody = document.getElementById('results-body');
  tbody.innerHTML = results.map(r => {
    const deviationClass = Math.abs(r.deviation) < 1 ? 'deviation-good'
      : Math.abs(r.deviation) < 3 ? 'deviation-ok'
      : 'deviation-bad';
    const deviationSign = r.deviation >= 0 ? '+' : '';

    return `
      <tr>
        <td>
          <div class="etf-name-cell">
            <div class="etf-color-dot" style="color: ${r.color}; background: ${r.color}"></div>
            <span>${r.shortName}</span>
          </div>
        </td>
        <td class="buy-units">${r.buyUnits > 0 ? '+' + r.buyUnits : '—'}</td>
        <td>₪${r.buyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${r.newUnits.toLocaleString()}</td>
        <td>₪${r.newValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${(r.target * 100).toFixed(0)}%</td>
        <td>${r.actualPct.toFixed(1)}%</td>
        <td class="${deviationClass}">${deviationSign}${r.deviation.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  // Render footer
  const tfoot = document.getElementById('results-footer');
  const totalNewValue = results.reduce((sum, r) => sum + r.newValue, 0);
  const totalBuyUnits = results.reduce((sum, r) => sum + r.buyUnits, 0);
  tfoot.innerHTML = `
    <tr>
      <td>Total</td>
      <td class="buy-units">+${totalBuyUnits}</td>
      <td>₪${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td></td>
      <td>₪${totalNewValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>100%</td>
      <td></td>
      <td></td>
    </tr>
  `;

  // Render allocation bars
  renderAllocationBars(results);

  // Render summary cards
  renderSummaryCards(results, totalInvested, leftover);

  // Scroll to results
  setTimeout(() => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ===== Allocation Bars =====
function renderAllocationBars(results) {
  const container = document.getElementById('allocation-visual');
  container.innerHTML = `
    <div class="allocation-visual-label">Portfolio Allocation vs Target</div>
    <div class="allocation-bars">
      ${results.map(r => `
        <div class="alloc-bar-row">
          <div class="alloc-bar-label">${r.shortName}</div>
          <div class="alloc-bar-track">
            <div
              class="alloc-bar-fill"
              style="
                width: ${Math.min(r.actualPct, 100)}%;
                background: linear-gradient(90deg, ${r.colorHex}, ${r.colorHex}cc);
              "
            >
              <span class="alloc-bar-value">${r.actualPct.toFixed(1)}%</span>
            </div>
            <div class="alloc-bar-target" style="left: ${r.target * 100}%">
              <span class="alloc-bar-target-label">Target ${(r.target * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Animate bars in
  requestAnimationFrame(() => {
    container.querySelectorAll('.alloc-bar-fill').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.width = w;
      });
    });
  });
}

// ===== Summary Cards =====
function renderSummaryCards(results, totalInvested, leftover) {
  const container = document.getElementById('summary-cards');
  const maxDeviation = Math.max(...results.map(r => Math.abs(r.deviation)));
  const totalPortfolio = results.reduce((sum, r) => sum + r.newValue, 0);

  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-card-label">Total Portfolio</div>
      <div class="summary-card-value accent">₪${totalPortfolio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Invested Today</div>
      <div class="summary-card-value green">₪${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Max Deviation</div>
      <div class="summary-card-value ${maxDeviation < 1 ? 'green' : maxDeviation < 3 ? 'yellow' : ''}">${maxDeviation.toFixed(1)}%</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Uninvested + Fees</div>
      <div class="summary-card-value">₪${(leftover + FEE_RESERVE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
  `;
}

// ===== DASHBOARD =====
function updateDashboard() {
  const currentValues = ETF_CONFIG.map(etf => ({
    ...etf,
    units: state.holdings[etf.id] || 0,
    price: state.prices[etf.id] || 0,
    value: (state.holdings[etf.id] || 0) * (state.prices[etf.id] || 0),
  }));

  const totalValue = currentValues.reduce((sum, e) => sum + e.value, 0);

  // Update total label
  const totalEl = document.getElementById('dashboard-total');
  if (totalEl) {
    totalEl.textContent = `₪${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  // Update Donut Chart Segments
  const segmentsGroup = document.getElementById('donut-segments');
  let currentOffset = 100; // Start from top (stroke-dashoffset moves backwards)
  
  if (segmentsGroup) {
    if (totalValue === 0) {
      segmentsGroup.innerHTML = '';
    } else {
      segmentsGroup.innerHTML = currentValues.map(etf => {
        const pct = (etf.value / totalValue) * 100;
        if (pct === 0) return '';
        
        // Dasharray: [length of dash (pct), length of gap (100 - pct)]
        const dashArray = `${pct} ${100 - pct}`;
        
        const circle = `
          <circle
            class="donut-segment"
            cx="18" cy="18" r="15.91549430918954"
            fill="transparent"
            stroke="${etf.colorHex}"
            stroke-width="4"
            stroke-dasharray="${dashArray}"
            stroke-dashoffset="${currentOffset}"
          ></circle>
        `;
        currentOffset -= pct;
        return circle;
      }).join('');
    }
  }

  // Update Legend
  const legend = document.getElementById('dashboard-legend');
  if (legend) {
    legend.innerHTML = currentValues.map(etf => {
      const pct = totalValue > 0 ? (etf.value / totalValue) * 100 : 0;
      return `
        <div class="legend-item">
          <div class="etf-color-dot" style="background: ${etf.color}; box-shadow: 0 0 8px ${etf.color}"></div>
          <div class="legend-info">
            <div class="legend-name">${etf.shortName}</div>
            <div class="legend-value">₪${etf.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div class="legend-pct" style="color: ${etf.color}">${pct.toFixed(1)}%</div>
        </div>
      `;
    }).join('');
  }
}

// ===== HISTORY =====
function saveToHistory() {
  if (!state.currentCalculation) return;
  
  // Add to history
  const record = {
    id: Date.now().toString(),
    ...state.currentCalculation
  };
  state.history.unshift(record); // Add to beginning
  
  // Update holdings
  state.currentCalculation.results.forEach(r => {
    state.holdings[r.id] = r.newUnits;
    const input = document.getElementById(`holding-${r.id}`);
    if (input) input.value = r.newUnits;
    updateHoldingValue(r.id);
  });
  
  // Clear deposit
  state.deposit = 0;
  const depInput = document.getElementById('deposit-amount');
  if (depInput) depInput.value = '';
  document.getElementById('reserved-fees').textContent = `₪${FEE_RESERVE.toLocaleString()}`;
  document.getElementById('available-invest').textContent = `₪0`;
  
  state.currentCalculation = null;
  updateButtonState();
  updateDashboard();
  saveState();
  
  // Hide results, render history
  document.getElementById('section-results').classList.remove('visible');
  document.getElementById('section-results').classList.add('hidden');
  
  renderHistory();
  
  // Provide visual feedback
  const btn = document.getElementById('btn-save-history');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Saved & Updated!`;
  btn.disabled = true;
  btn.classList.add('btn-success');
  
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.classList.remove('btn-success');
  }, 3000);
}

function renderHistory() {
  const section = document.getElementById('section-history');
  const container = document.getElementById('history-list');
  
  if (!section || !container) return;
  
  if (!state.history || state.history.length === 0) {
    section.classList.add('hidden');
    section.classList.remove('visible');
    return;
  }
  
  section.classList.remove('hidden');
  section.classList.add('visible');
  
  container.innerHTML = state.history.map(record => {
    const d = new Date(record.date);
    const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    
    return `
      <div class="history-item">
        <div class="history-header">
          <div class="history-date">${dateStr}</div>
          <div class="history-deposit">Deposited: <strong>₪${record.totalDeposit.toLocaleString()}</strong></div>
          <button class="btn-delete" data-delete-id="${record.id}" aria-label="Delete record" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
        <div class="history-details">
          ${record.results.map(r => `
            <div class="history-etf">
              <div class="history-etf-name">
                <span class="etf-color-dot" style="background: ${r.color}; box-shadow: none; width: 8px; height: 8px;"></span>
                ${r.shortName}
              </div>
              <div class="history-etf-buy ${r.buyUnits > 0 ? 'history-bought' : ''}">
                ${r.buyUnits > 0 ? '+' + r.buyUnits + ' units' : 'No purchase'}
              </div>
              <div class="history-etf-price">@ ₪${r.price.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function deleteHistoryRecord(id) {
  if (confirm('Are you sure you want to delete this history record?')) {
    state.history = state.history.filter(h => h.id !== id);
    saveState();
    renderHistory();
  }
}

// ===== PERSISTENCE =====
const STORAGE_KEY = 'lazyinvestor_state';

function saveState() {
  const data = {
    prices: state.prices,
    holdings: state.holdings,
    deposit: state.deposit,
    history: state.history,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage not available
  }

  // Save to backup file via local API
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(e => {
    console.error('Failed to save backup:', e);
  });
}

async function loadSavedState() {
  let data = null;

  try {
    // First try to load from local file backup
    const res = await fetch('/api/data');
    if (res.ok) {
      const backupData = await res.json();
      if (Object.keys(backupData).length > 0) {
        data = backupData;
      }
    }
  } catch (e) {
    console.warn('Could not load from backup, falling back to localStorage');
  }

  // Fallback to localStorage if backup is empty or failed
  if (!data) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        data = JSON.parse(saved);
        // If we found local storage data but no backup data, sync it up!
        saveState(); 
      }
    } catch (e) {
      // ignore
    }
  }

  if (!data) return;

  // Restore history
  if (data.history) {
    state.history = data.history;
  }

    // Restore prices
    if (data.prices) {
      Object.entries(data.prices).forEach(([id, price]) => {
        state.prices[id] = price;
        const input = document.getElementById(`price-${id}`);
        if (input && price > 0) input.value = price;
      });
    }

    // Restore holdings
    if (data.holdings) {
      Object.entries(data.holdings).forEach(([id, units]) => {
        state.holdings[id] = units;
        const input = document.getElementById(`holding-${id}`);
        if (input && units > 0) input.value = units;
      });
    }

    // Restore deposit
    if (data.deposit) {
      state.deposit = data.deposit;
      const input = document.getElementById('deposit-amount');
      if (input && data.deposit > 0) input.value = data.deposit;
      handleDepositInput({ target: input });
    }

    // Update all value displays
    ETF_CONFIG.forEach(etf => updateHoldingValue(etf.id));
    updateButtonState();
    updateDashboard();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', init);

// ===== MARKET STATUS =====
function updateMarketStatus() {
  const container = document.getElementById('market-status-container');
  if (!container) return;

  const now = new Date();
  
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });
    
    const parts = timeFormatter.formatToParts(now);
    const timeParts = {};
    parts.forEach(p => {
      timeParts[p.type] = p.value;
    });

    const rawHour = parseInt(timeParts.hour, 10) || 0;
    const hour = rawHour % 24;
    const minute = parseInt(timeParts.minute, 10) || 0;
    const second = parseInt(timeParts.second, 10) || 0;
    const weekday = timeParts.weekday || '';
    const currentDay = weekday.toLowerCase();

    // Map day name to Sunday-based day index (0-6)
    const DAYS_MAP = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const dayIndex = DAYS_MAP[currentDay] !== undefined ? DAYS_MAP[currentDay] : 0;

    // Define schedule rules
    const schedule = [
      { open: { h: 9, m: 59 }, close: { h: 17, m: 25 }, days: [1, 2, 3, 4] }, // Mon - Thu
      { open: { h: 9, m: 59 }, close: { h: 13, m: 50 }, days: [5] }           // Fri
    ];

    // Generate weekly events in seconds (relative to Sunday 00:00:00)
    const events = [];
    schedule.forEach(sched => {
      sched.days.forEach(day => {
        events.push({
          type: 'open',
          seconds: day * 86400 + sched.open.h * 3600 + sched.open.m * 60
        });
        events.push({
          type: 'close',
          seconds: day * 86400 + sched.close.h * 3600 + sched.close.m * 60
        });
      });
    });

    // Sort events chronologically
    events.sort((a, b) => a.seconds - b.seconds);

    // Calculate current seconds relative to start of the week
    const currentWeeklySeconds = dayIndex * 86400 + hour * 3600 + minute * 60 + second;

    // Find next event
    let nextEvent = events.find(e => e.seconds > currentWeeklySeconds);
    let diffSeconds = 0;

    if (nextEvent) {
      diffSeconds = nextEvent.seconds - currentWeeklySeconds;
    } else {
      // Wrap around to the start of the next week
      nextEvent = events[0];
      diffSeconds = (7 * 86400 - currentWeeklySeconds) + nextEvent.seconds;
    }

    // Determine if market is currently open
    // If next transition is 'close', then it is currently open.
    // If next transition is 'open', then it is currently closed.
    const isOpen = nextEvent.type === 'close';

    // Format countdown string
    const daysLeft = Math.floor(diffSeconds / 86400);
    const hoursLeft = Math.floor((diffSeconds % 86400) / 3600);
    const minutesLeft = Math.floor((diffSeconds % 3600) / 60);
    const secondsLeft = diffSeconds % 60;

    let countdownStr = '';
    if (daysLeft > 0) {
      countdownStr = `${daysLeft}d ${hoursLeft}h`;
    } else if (hoursLeft > 0) {
      countdownStr = `${hoursLeft}h ${minutesLeft}m`;
    } else {
      countdownStr = `${minutesLeft}m ${secondsLeft}s`;
    }

    const pad = (num) => String(num).padStart(2, '0');
    const timeStr = `${pad(hour)}:${pad(minute)}:${pad(second)}`;

    const isMonThu = ['monday', 'tuesday', 'wednesday', 'thursday'].includes(currentDay);
    const isFri = currentDay === 'friday';
    const isSatSun = ['saturday', 'sunday'].includes(currentDay);

    container.innerHTML = `
      <div class="market-status ${isOpen ? 'open' : 'closed'}">
        <div class="market-time">
          <span>${timeStr}</span>
          <span class="timezone-label">Israel Time</span>
        </div>
        <div class="market-status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">${isOpen ? 'TASE Open' : 'TASE Closed'}</span>
        </div>
        <div class="market-countdown">
          <span>${isOpen ? 'Closes in' : 'Opens in'} ${countdownStr}</span>
        </div>
        <div class="market-tooltip">
          <div class="tooltip-header">TASE Opening Hours (IST)</div>
          <div class="tooltip-row ${isMonThu ? 'active-day' : ''}">
            <span>Mon – Thu</span>
            <span>09:59 – 17:25</span>
          </div>
          <div class="tooltip-row ${isFri ? 'active-day' : ''}">
            <span>Friday</span>
            <span>09:59 – 13:50</span>
          </div>
          <div class="tooltip-row closed ${isSatSun ? 'active-day' : ''}">
            <span>Sat – Sun</span>
            <span>Closed</span>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Error updating market status:', e);
  }
}

