const STORAGE_KEY = "dip-buy-calculator";
const PAIR_STORAGE_KEY = "dip-calculator-pairs";
const PORTFOLIO_STORAGE_KEY = "dip-calculator-portfolios";

const DEFAULT_PAIR = {
  pairName: "BTC",
  anchorPrice: 100000,
  currentPrice: 100000,
  coinsHeld: 1,
  cashAvailable: 10000,
  cashDeployPercent: 50,
  levels: [
    { id: "lvl-1", dipPercent: 10, buyPercent: 20 },
    { id: "lvl-2", dipPercent: 20, buyPercent: 30 },
    { id: "lvl-3", dipPercent: 30, buyPercent: 50 },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

// Portfolio state: { pairs: [...], activePairIndex: 0 }
let portfolio = hydratePortfolio();
let pairCounter = getPairCounter(portfolio.pairs);
let levelCounter = {};

// Initialize level counters for each pair
portfolio.pairs.forEach((pair, idx) => {
  levelCounter[idx] = getLevelCounter(pair.levels);
});

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const inputs = Array.from(document.querySelectorAll("[data-field]"));
const levelsBody = document.getElementById("levels-body");
const addLevelBtn = document.getElementById("add-level");
const resetButton = document.getElementById("reset-button");
const tabsList = document.getElementById("tabs-list");
const addTabBtn = document.getElementById("add-tab");
const savePairBtn = document.getElementById("save-pair");
const loadPairBtn = document.getElementById("load-pair");
const exportPairBtn = document.getElementById("export-pair");
const importPairBtn = document.getElementById("import-pair");
const importPairFile = document.getElementById("import-pair-file");
const savePortfolioBtn = document.getElementById("save-portfolio");
const loadPortfolioBtn = document.getElementById("load-portfolio");
const exportPortfolioBtn = document.getElementById("export-portfolio");
const importPortfolioBtn = document.getElementById("import-portfolio");
const importPortfolioFile = document.getElementById("import-portfolio-file");
const loadPairSelect = document.getElementById("load-pair-select");
const loadPortfolioSelect = document.getElementById("load-portfolio-select");

const summaryEls = {
  spend: document.getElementById("total-spend"),
  remaining: document.getElementById("remaining-cash"),
  coins: document.getElementById("total-coins"),
  avg: document.getElementById("avg-entry"),
};
const percentWarningEl = document.getElementById("percent-warning");

init();

function init() {
  renderTabs();
  syncInputs();
  attachListeners();
  populatePairDropdown();
  populatePortfolioDropdown();
  recalc();
}

function hydratePortfolio() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if it's old format (single pair) or new format (portfolio)
      if (parsed.pairs && Array.isArray(parsed.pairs)) {
        // New format
        return {
          pairs: parsed.pairs.map(normalizePair),
          activePairIndex: parsed.activePairIndex || 0,
        };
      } else {
        // Old format - migrate to new format
      return {
          pairs: [normalizePair(parsed)],
          activePairIndex: 0,
      };
      }
    }
  } catch (err) {
    console.warn("Unable to load saved portfolio", err);
  }
  return {
    pairs: [clone(DEFAULT_PAIR)],
    activePairIndex: 0,
  };
}

function normalizePair(pair) {
  return {
    pairName: pair.pairName || DEFAULT_PAIR.pairName,
    anchorPrice: Number(pair.anchorPrice) || DEFAULT_PAIR.anchorPrice,
    currentPrice: Number(pair.currentPrice) || DEFAULT_PAIR.currentPrice,
    coinsHeld: Number(pair.coinsHeld) || DEFAULT_PAIR.coinsHeld,
    cashAvailable: Number(pair.cashAvailable) || DEFAULT_PAIR.cashAvailable,
    cashDeployPercent: Number(pair.cashDeployPercent) || DEFAULT_PAIR.cashDeployPercent,
    levels: normalizeLevels(pair.levels || DEFAULT_PAIR.levels),
  };
}

function normalizeLevels(levels) {
  if (!Array.isArray(levels) || !levels.length) {
    return clone(DEFAULT_PAIR.levels);
  }
  return levels.map((lvl, idx) => ({
    id: typeof lvl.id === "string" ? lvl.id : `lvl-${idx + 1}`,
    dipPercent: Number(lvl.dipPercent) || 0,
    buyPercent: Number(lvl.buyPercent) || 0,
  }));
}

function getLevelCounter(levels) {
  return levels.reduce((max, lvl) => {
    const match = typeof lvl.id === "string" && lvl.id.match(/lvl-(\d+)/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, levels.length);
}

function getPairCounter(pairs) {
  return pairs.reduce((max, pair, idx) => {
    // Extract number from pair name or use index
    return Math.max(max, idx);
  }, pairs.length);
}

function getCurrentPair() {
  return portfolio.pairs[portfolio.activePairIndex];
}

function setCurrentPair(pair) {
  portfolio.pairs[portfolio.activePairIndex] = pair;
}

function syncInputs() {
  const pair = getCurrentPair();
  inputs.forEach((input) => {
    const field = input.dataset.field;
    if (!field) return;
    const value = pair[field];
    input.value = typeof value === "number" && !Number.isNaN(value) ? value : value ?? "";
  });
}

function renderTabs() {
  tabsList.innerHTML = portfolio.pairs
    .map((pair, idx) => {
      const isActive = idx === portfolio.activePairIndex;
      return `
        <div class="tab ${isActive ? "active" : ""}" data-tab-index="${idx}">
          <span class="tab-label">${escapeHtml(pair.pairName || `Pair ${idx + 1}`)}</span>
          <button class="tab-close" data-action="close-tab" title="Close tab">×</button>
        </div>
      `;
    })
    .join("");

  // Attach tab event listeners
  tabsList.querySelectorAll(".tab").forEach((tab) => {
    const index = parseInt(tab.dataset.tabIndex);
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) return;
      switchTab(index);
    });
  });

  tabsList.querySelectorAll(".tab-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tab = btn.closest(".tab");
      const index = parseInt(tab.dataset.tabIndex);
      closeTab(index);
    });
  });
}

function switchTab(index) {
  if (index < 0 || index >= portfolio.pairs.length) return;
  portfolio.activePairIndex = index;
  renderTabs();
  syncInputs();
  recalc();
  persistPortfolio();
}

function addTab() {
  const newPair = clone(DEFAULT_PAIR);
  newPair.pairName = `Pair ${portfolio.pairs.length + 1}`;
  portfolio.pairs.push(newPair);
  portfolio.activePairIndex = portfolio.pairs.length - 1;
  pairCounter = portfolio.pairs.length;
  levelCounter[portfolio.activePairIndex] = getLevelCounter(newPair.levels);
  renderTabs();
  syncInputs();
  recalc();
  persistPortfolio();
}

function closeTab(index) {
  if (portfolio.pairs.length <= 1) {
    alert("Cannot close the last tab. Add another tab first.");
    return;
  }
  portfolio.pairs.splice(index, 1);
  delete levelCounter[index];
  
  // Adjust active index if needed
  if (portfolio.activePairIndex >= portfolio.pairs.length) {
    portfolio.activePairIndex = portfolio.pairs.length - 1;
  } else if (portfolio.activePairIndex > index) {
    portfolio.activePairIndex--;
  }
  
  renderTabs();
  syncInputs();
  recalc();
  persistPortfolio();
}

function attachListeners() {
  inputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      const pair = getCurrentPair();
      if (event.target.type === "text") {
        pair[field] = event.target.value;
      } else {
        pair[field] = parseNumber(event.target.value);
      }
      setCurrentPair(pair);
      recalc();
    });
  });

  addLevelBtn.addEventListener("click", () => {
    addLevel();
  });

  resetButton.addEventListener("click", () => {
    resetCurrentPair();
  });

  addTabBtn.addEventListener("click", () => {
    addTab();
  });

  // Pair storage
  savePairBtn.addEventListener("click", () => {
    savePairToStorage();
  });

  loadPairBtn.addEventListener("click", () => {
    loadPairFromStorage();
  });

  exportPairBtn.addEventListener("click", () => {
    exportPairToFile();
  });

  importPairBtn.addEventListener("click", () => {
    importPairFile.click();
  });

  importPairFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      importPairFromFile(file);
      e.target.value = ""; // Reset input
    }
  });

  // Portfolio storage
  savePortfolioBtn.addEventListener("click", () => {
    savePortfolioToStorage();
  });

  loadPortfolioBtn.addEventListener("click", () => {
    loadPortfolioFromStorage();
  });

  exportPortfolioBtn.addEventListener("click", () => {
    exportPortfolioToFile();
  });

  importPortfolioBtn.addEventListener("click", () => {
    importPortfolioFile.click();
  });

  importPortfolioFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      importPortfolioFromFile(file);
      e.target.value = ""; // Reset input
    }
  });

  // Update state on input, but don't recalculate yet
  levelsBody.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.classList.contains("level-input")) return;
    const prop = target.dataset.prop;
    const levelId = target.closest("tr")?.dataset.id;
    if (!prop || !levelId) return;
    updateLevel(levelId, prop, parseNumber(target.value), false);
  });

  // Trigger calculation on Enter key or blur
  levelsBody.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!target.classList.contains("level-input")) return;
    if (event.key === "Enter") {
      event.preventDefault();
      const prop = target.dataset.prop;
      const levelId = target.closest("tr")?.dataset.id;
      if (prop && levelId) {
        updateLevel(levelId, prop, parseNumber(target.value), true);
        target.blur();
      }
    }
  });

  levelsBody.addEventListener("blur", (event) => {
    const target = event.target;
    if (!target.classList.contains("level-input")) return;
    const prop = target.dataset.prop;
    const levelId = target.closest("tr")?.dataset.id;
    if (prop && levelId) {
      updateLevel(levelId, prop, parseNumber(target.value), true);
    }
  }, true);

  levelsBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const levelId = button.closest("tr")?.dataset.id;
    if (action === "remove" && levelId) {
      removeLevel(levelId);
    }
  });
}

function addLevel() {
  const pair = getCurrentPair();
  const last = pair.levels[pair.levels.length - 1];
  const idx = portfolio.activePairIndex;
  levelCounter[idx] = (levelCounter[idx] || 0) + 1;
  pair.levels.push({
    id: `lvl-${levelCounter[idx]}`,
    dipPercent: (last?.dipPercent ?? 0) + 5,
    buyPercent: last?.buyPercent ?? 10,
  });
  setCurrentPair(pair);
  recalc();
}

function removeLevel(levelId) {
  const pair = getCurrentPair();
  if (pair.levels.length <= 1) {
    pair.levels = [clone(DEFAULT_PAIR.levels[0])];
  } else {
    pair.levels = pair.levels.filter((lvl) => lvl.id !== levelId);
  }
  setCurrentPair(pair);
  recalc();
}

function updateLevel(id, prop, value, shouldRecalc = true) {
  const pair = getCurrentPair();
  const level = pair.levels.find((lvl) => lvl.id === id);
  if (!level) return;

  if (prop === "dipPercent") {
    level[prop] = clampValue(value, 0, 99);
  } else if (prop === "buyPercent") {
    level[prop] = clampValue(value, 0, 100);
  } else {
    level[prop] = value;
  }

  setCurrentPair(pair);

  if (shouldRecalc) {
  recalc();
  } else {
    persistPortfolio();
  }
}

function resetCurrentPair() {
  const pair = clone(DEFAULT_PAIR);
  setCurrentPair(pair);
  levelCounter[portfolio.activePairIndex] = getLevelCounter(pair.levels);
  syncInputs();
  recalc();
}

function recalc() {
  const calculations = buildCalculations();
  renderLevels(calculations);
  renderSummary(calculations);
  renderWarnings(calculations);
  persistPortfolio();
}

function buildCalculations() {
  const pair = getCurrentPair();
  const anchorPrice = clampPositive(pair.anchorPrice);
  const coinsHeld = clampPositive(pair.coinsHeld);
  const cashAvailable = clampPositive(pair.cashAvailable);
  const deployPercent = clampValue(pair.cashDeployPercent, 0, 100);
  const currentPrice = clampPositive(pair.currentPrice);
  const deployableCash = cashAvailable * (deployPercent / 100);

  let totalPercent = 0;
  let totalSpend = 0;
  let totalCoinsBought = 0;

  const rows = pair.levels.map((level, idx) => {
    const dipPercent = Number(level.dipPercent) || 0;
    const buyPercent = Number(level.buyPercent) || 0;
    totalPercent += buyPercent;

    const dipPrice = Math.max(anchorPrice * (1 - dipPercent / 100), 0);
    const buyAmount = deployableCash * (buyPercent / 100);
    const quantity = dipPrice > 0 ? buyAmount / dipPrice : 0;

    totalSpend += buyAmount;
    totalCoinsBought += quantity;

    return {
      id: level.id,
      order: idx + 1,
      dipPercent,
      buyPercent,
      dipPrice,
      buyAmount,
      quantity,
      reached: currentPrice > 0 && currentPrice <= dipPrice && dipPrice > 0,
    };
  });

  const newTotalCoins = coinsHeld + totalCoinsBought;
  const assumedCostBasis = coinsHeld * anchorPrice;
  const avgEntry = newTotalCoins > 0 ? (assumedCostBasis + totalSpend) / newTotalCoins : 0;
  const remainingCash = cashAvailable - totalSpend;

  return {
    rows,
    totals: {
      totalSpend,
      remainingCash,
      totalCoins: newTotalCoins,
      avgEntry,
    },
    totalPercent,
    deployableCash,
  };
}

function renderLevels({ rows }) {
  if (!rows.length) {
    levelsBody.innerHTML = `<tr><td colspan="7">No dip levels yet. Add one to get started.</td></tr>`;
    return;
  }

  const activeElement = document.activeElement;
  const isLevelInput = activeElement && activeElement.classList.contains("level-input");
  const focusInfo = isLevelInput
    ? {
        levelId: activeElement.closest("tr")?.dataset.id,
        prop: activeElement.dataset.prop,
      }
    : null;

  levelsBody.innerHTML = rows
    .map((row) => {
      const rowClass = row.reached ? 'class="level-reached"' : "";
      return `
        <tr data-id="${row.id}" ${rowClass}>
          <td>${row.order}</td>
          <td>
            <input
              type="number"
              class="level-input"
              data-prop="dipPercent"
              value="${row.dipPercent}"
              min="0"
              max="99"
              step="0.5"
            />
          </td>
          <td>
            <input
              type="number"
              class="level-input"
              data-prop="buyPercent"
              value="${row.buyPercent}"
              min="0"
              max="100"
              step="1"
            />
          </td>
          <td>${currencyFmt.format(row.dipPrice || 0)}</td>
          <td>${currencyFmt.format(row.buyAmount || 0)}</td>
          <td>${qtyFmt.format(row.quantity || 0)}</td>
          <td class="level-actions">
            <button type="button" title="Remove level" data-action="remove">&minus;</button>
          </td>
        </tr>
      `;
    })
    .join("");

  if (focusInfo && focusInfo.levelId && focusInfo.prop) {
    requestAnimationFrame(() => {
      const row = levelsBody.querySelector(`tr[data-id="${focusInfo.levelId}"]`);
      if (row) {
        const input = row.querySelector(`input[data-prop="${focusInfo.prop}"]`);
        if (input) {
          input.focus();
        }
      }
    });
  }
}

function renderSummary({ totals }) {
  summaryEls.spend.textContent = currencyFmt.format(totals.totalSpend || 0);
  summaryEls.remaining.textContent = currencyFmt.format(totals.remainingCash || 0);
  summaryEls.coins.textContent = qtyFmt.format(totals.totalCoins || 0);
  summaryEls.avg.textContent = totals.avgEntry ? currencyFmt.format(totals.avgEntry) : "$0";
}

function renderWarnings({ totalPercent, deployableCash }) {
  if (totalPercent > 100) {
    percentWarningEl.textContent = `Heads up: total buy % is ${totalPercent.toFixed(
      1,
    )}%. Consider capping at 100% or lowering individual levels.`;
  } else if (deployableCash === 0) {
    percentWarningEl.textContent = "Enter cash and deploy % to see allocations.";
  } else {
    percentWarningEl.textContent = "";
  }
}

// Storage functions
function persistPortfolio() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  } catch (err) {
    console.warn("Unable to save portfolio", err);
  }
}

function populatePairDropdown() {
  try {
    const saved = localStorage.getItem(PAIR_STORAGE_KEY);
    if (!saved) {
      loadPairSelect.style.display = "none";
      return;
    }
    const pairs = JSON.parse(saved);
    const names = Object.keys(pairs);
    
    if (names.length === 0) {
      loadPairSelect.style.display = "none";
      return;
    }
    
    loadPairSelect.innerHTML = '<option value="">Select a pair to load...</option>';
    names.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      loadPairSelect.appendChild(option);
    });
    loadPairSelect.style.display = "inline-block";
  } catch (err) {
    loadPairSelect.style.display = "none";
  }
}

function populatePortfolioDropdown() {
  try {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!saved) {
      loadPortfolioSelect.style.display = "none";
      return;
    }
    const portfolios = JSON.parse(saved);
    const names = Object.keys(portfolios);
    
    if (names.length === 0) {
      loadPortfolioSelect.style.display = "none";
      return;
    }
    
    loadPortfolioSelect.innerHTML = '<option value="">Select a portfolio to load...</option>';
    names.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      loadPortfolioSelect.appendChild(option);
    });
    loadPortfolioSelect.style.display = "inline-block";
  } catch (err) {
    loadPortfolioSelect.style.display = "none";
  }
}

function savePairToStorage() {
  const pair = getCurrentPair();
  const name = prompt("Enter a name for this pair preset:", pair.pairName || "My Pair");
  if (!name) return;

  try {
    const saved = localStorage.getItem(PAIR_STORAGE_KEY);
    const pairs = saved ? JSON.parse(saved) : {};
    pairs[name] = clone(pair);
    localStorage.setItem(PAIR_STORAGE_KEY, JSON.stringify(pairs));
    populatePairDropdown();
    alert(`Pair "${name}" saved successfully!`);
  } catch (err) {
    alert("Error saving pair: " + err.message);
  }
}

function loadPairFromStorage() {
  const selectedName = loadPairSelect.value;
  if (!selectedName) {
    alert("Please select a pair to load.");
    return;
  }

  try {
    const saved = localStorage.getItem(PAIR_STORAGE_KEY);
    if (!saved) {
      alert("No saved pairs found.");
      return;
    }
    const pairs = JSON.parse(saved);
    
    if (!pairs[selectedName]) {
      alert("Pair not found.");
      return;
    }

    const pair = normalizePair(pairs[selectedName]);
    setCurrentPair(pair);
    levelCounter[portfolio.activePairIndex] = getLevelCounter(pair.levels);
    syncInputs();
    recalc();
    renderTabs();
    loadPairSelect.value = ""; // Reset selection
    alert(`Pair "${selectedName}" loaded successfully!`);
  } catch (err) {
    alert("Error loading pair: " + err.message);
  }
}

function exportPairToFile() {
  const pair = getCurrentPair();
  const name = pair.pairName || "pair";
  const dataStr = JSON.stringify(pair, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-dip-plan.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importPairFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const pair = normalizePair(JSON.parse(e.target.result));
      setCurrentPair(pair);
      levelCounter[portfolio.activePairIndex] = getLevelCounter(pair.levels);
      syncInputs();
      recalc();
      renderTabs();
      populatePairDropdown();
      alert("Pair imported successfully!");
    } catch (err) {
      alert("Error importing pair: " + err.message);
    }
  };
  reader.readAsText(file);
}

function savePortfolioToStorage() {
  const name = prompt("Enter a name for this portfolio:", "My Portfolio");
  if (!name) return;

  try {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    const portfolios = saved ? JSON.parse(saved) : {};
    portfolios[name] = clone(portfolio);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolios));
    populatePortfolioDropdown();
    alert(`Portfolio "${name}" saved successfully!`);
  } catch (err) {
    alert("Error saving portfolio: " + err.message);
  }
}

function loadPortfolioFromStorage() {
  const selectedName = loadPortfolioSelect.value;
  if (!selectedName) {
    alert("Please select a portfolio to load.");
    return;
  }

  try {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!saved) {
      alert("No saved portfolios found.");
      return;
    }
    const portfolios = JSON.parse(saved);
    
    if (!portfolios[selectedName]) {
      alert("Portfolio not found.");
      return;
    }

    portfolio = portfolios[selectedName];
    portfolio.pairs = portfolio.pairs.map(normalizePair);
    if (portfolio.activePairIndex >= portfolio.pairs.length) {
      portfolio.activePairIndex = 0;
    }

    // Rebuild level counters
    levelCounter = {};
    portfolio.pairs.forEach((pair, idx) => {
      levelCounter[idx] = getLevelCounter(pair.levels);
    });

    renderTabs();
    syncInputs();
    recalc();
    populatePairDropdown();
    populatePortfolioDropdown();
    loadPortfolioSelect.value = ""; // Reset selection
    alert(`Portfolio "${selectedName}" loaded successfully!`);
  } catch (err) {
    alert("Error loading portfolio: " + err.message);
  }
}

function exportPortfolioToFile() {
  const name = prompt("Enter filename (without extension):", "my-portfolio");
  if (!name) return;

  const dataStr = JSON.stringify(portfolio, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importPortfolioFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.pairs || !Array.isArray(imported.pairs)) {
        throw new Error("Invalid portfolio format");
      }

      portfolio = {
        pairs: imported.pairs.map(normalizePair),
        activePairIndex: imported.activePairIndex || 0,
      };

      if (portfolio.activePairIndex >= portfolio.pairs.length) {
        portfolio.activePairIndex = 0;
      }

      // Rebuild level counters
      levelCounter = {};
      portfolio.pairs.forEach((pair, idx) => {
        levelCounter[idx] = getLevelCounter(pair.levels);
      });

      renderTabs();
      syncInputs();
      recalc();
      populatePairDropdown();
      populatePortfolioDropdown();
      alert("Portfolio imported successfully!");
    } catch (err) {
      alert("Error importing portfolio: " + err.message);
    }
  };
  reader.readAsText(file);
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clampPositive(value) {
  const num = parseNumber(value);
  return num > 0 ? num : 0;
}

function clampValue(value, min, max) {
  const num = parseNumber(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
