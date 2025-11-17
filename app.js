const STORAGE_KEY = "dip-buy-calculator";

const DEFAULT_STATE = {
  pairName: "BTC/USDT",
  anchorPrice: 60000,
  currentPrice: 58000,
  coinsHeld: 0.5,
  cashAvailable: 5000,
  cashDeployPercent: 80,
  levels: [
    { id: "lvl-1", dipPercent: 5, buyPercent: 20 },
    { id: "lvl-2", dipPercent: 10, buyPercent: 30 },
    { id: "lvl-3", dipPercent: 15, buyPercent: 50 },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

let state = hydrateState();
let levelCounter = getLevelCounter(state.levels);

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
const summaryEls = {
  spend: document.getElementById("total-spend"),
  remaining: document.getElementById("remaining-cash"),
  coins: document.getElementById("total-coins"),
  avg: document.getElementById("avg-entry"),
};
const percentWarningEl = document.getElementById("percent-warning");

init();

function init() {
  syncInputs();
  attachListeners();
  recalc();
}

function hydrateState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        levels: normalizeLevels(parsed.levels || DEFAULT_STATE.levels),
      };
    }
  } catch (err) {
    console.warn("Unable to load saved calculator state", err);
  }
  return clone(DEFAULT_STATE);
}

function normalizeLevels(levels) {
  if (!Array.isArray(levels) || !levels.length) {
    return clone(DEFAULT_STATE.levels);
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

function syncInputs() {
  inputs.forEach((input) => {
    const field = input.dataset.field;
    if (!field) return;
    const value = state[field];
    input.value = typeof value === "number" && !Number.isNaN(value) ? value : value ?? "";
  });
}

function attachListeners() {
  inputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      if (event.target.type === "text") {
        state[field] = event.target.value;
      } else {
        state[field] = parseNumber(event.target.value);
      }
      recalc();
    });
  });

  addLevelBtn.addEventListener("click", () => {
    addLevel();
  });

  resetButton.addEventListener("click", () => {
    resetState();
  });

  levelsBody.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.classList.contains("level-input")) return;
    const prop = target.dataset.prop;
    const levelId = target.closest("tr")?.dataset.id;
    if (!prop || !levelId) return;
    updateLevel(levelId, prop, parseNumber(target.value));
  });

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
  const last = state.levels[state.levels.length - 1];
  levelCounter += 1;
  state.levels.push({
    id: `lvl-${levelCounter}`,
    dipPercent: (last?.dipPercent ?? 0) + 5,
    buyPercent: last?.buyPercent ?? 10,
  });
  recalc();
}

function removeLevel(levelId) {
  if (state.levels.length <= 1) {
    state.levels = [clone(DEFAULT_STATE.levels[0])];
  } else {
    state.levels = state.levels.filter((lvl) => lvl.id !== levelId);
  }
  recalc();
}

function updateLevel(id, prop, value) {
  const level = state.levels.find((lvl) => lvl.id === id);
  if (!level) return;
  if (prop === "dipPercent") {
    level[prop] = clampValue(value, 0, 99);
  } else if (prop === "buyPercent") {
    level[prop] = clampValue(value, 0, 100);
  } else {
    level[prop] = value;
  }
  recalc();
}

function resetState() {
  state = clone(DEFAULT_STATE);
  levelCounter = getLevelCounter(state.levels);
  syncInputs();
  recalc();
}

function recalc() {
  const calculations = buildCalculations();
  renderLevels(calculations);
  renderSummary(calculations);
  renderWarnings(calculations);
  persistState();
}

function buildCalculations() {
  const anchorPrice = clampPositive(state.anchorPrice);
  const coinsHeld = clampPositive(state.coinsHeld);
  const cashAvailable = clampPositive(state.cashAvailable);
  const deployPercent = clampValue(state.cashDeployPercent, 0, 100);
  const currentPrice = clampPositive(state.currentPrice);
  const deployableCash = cashAvailable * (deployPercent / 100);

  let totalPercent = 0;
  let totalSpend = 0;
  let totalCoinsBought = 0;

  const rows = state.levels.map((level, idx) => {
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

  levelsBody.innerHTML = rows
    .map((row) => {
      const rowClass = row.reached ? "class=\"level-reached\"" : "";
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

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Unable to save calculator state", err);
  }
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
