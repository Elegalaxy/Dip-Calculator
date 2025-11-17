# Dip Calculator

A simple, vanilla HTML/CSS/JavaScript tool for planning crypto dip buy strategies. Calculate optimal entry points and allocations across multiple price levels.

## How to Run

Simply double-click `index.html` to open it in your web browser. No build step or dependencies required.

## Current Functionality

### Core Features

- **Pair Name Input**: Text field for trading pair (e.g., BTC, ETH)
- **Anchor / Starting Price**: Reference price used to calculate dip levels
- **Current Holding Price**: Current market price (used to highlight reached dip levels)
- **Coins Held**: Existing coin holdings included in calculations
- **Cash Available (USD)**: Total USD cash available for buying
- **Cash % To Deploy**: Percentage of available cash to allocate across dip levels

### Multi-Pair Support

- **Tabbed Interface**: Manage multiple trading pairs in one session
- **Add Tab**: Create new pairs with the "+" button
- **Close Tab**: Remove pairs (minimum 1 tab required)
- **Switch Tabs**: Click tabs to switch between pairs
- **Auto-save**: All pairs automatically saved to localStorage

### Dip Level Management

- **Multiple Dip Levels**: Table with configurable dip levels
  - Each level has editable Dip % (0-99%)
  - Each level has editable Buy % (0-100%)
  - Calculated Dip Price: `anchorPrice * (1 - dipPercent / 100)`
  - Calculated Buy Amount: `deployableCash * (buyPercent / 100)`
  - Calculated Quantity: `buyAmount / dipPrice`
- **Add Level Button**: Dynamically adds new dip levels
- **Remove Level Button**: Removes individual levels (minimum 1 level enforced)
- **Visual Feedback**: Reached dip levels highlighted in green when current price <= dip price
- **Tooltips**: Hover over labels and headers for helpful explanations

### Summary Calculations

- **Total Spend**: Sum of all buy amounts across levels
- **Remaining Cash**: Cash available minus total spend
- **Total Coins**: Existing holdings + all quantities from dip buys
- **Projected Avg Entry**: Weighted average entry price including existing holdings

### Pair Management

- **Save Pair**: Save current pair configuration with a custom name
- **Load Pair**: Load a previously saved pair from dropdown
- **Export Pair**: Download current pair as JSON file
- **Import Pair**: Import pair configuration from JSON file

### Portfolio Management

- **Save Portfolio**: Save entire portfolio (all pairs) with a custom name
- **Load Portfolio**: Load a previously saved portfolio from dropdown
- **Export Portfolio**: Download entire portfolio as JSON file
- **Import Portfolio**: Import portfolio configuration from JSON file

### User Experience

- **Auto-save**: All inputs automatically saved to localStorage
- **Reset Button**: Restores current pair to default values
- **Input Validation**: Clamps values to valid ranges
- **Warning Messages**: Alerts when total buy % exceeds 100%
- **Responsive Design**: Mobile-friendly layout
- **Real-time Calculations**: Updates on every input change
- **Focus Preservation**: Maintains input focus when levels are recalculated

### Default State

- Pair: BTC
- Anchor Price: $100,000
- Current Holding Price: $100,000
- Coins Held: 1
- Cash Available: $10,000
- Cash Deploy %: 50%
- 3 default levels: 10%, 20%, 30% dips with 20%, 30%, 50% allocations

## Usage

1. **Manage Pairs**: Use the tab interface to add, switch, or remove trading pairs
2. **Configure Scenario**: Enter pair name, anchor price, current price, holdings, and cash
3. **Set Dip Levels**: Add and configure dip levels with desired percentages
4. **View Summary**: Check total spend, remaining cash, total coins, and average entry price
5. **Save & Share**: Save pairs or portfolios for later use, or export/import JSON files

All changes are automatically saved to your browser's localStorage.

## Files Structure

- `index.html`: Main HTML structure with form inputs, tabs, and summary section (162 lines)
- `app.js`: Core logic - state management, calculations, rendering, pair/portfolio management (848 lines)
- `style.css`: Styling - responsive design, card-based layout, tooltips, tabs (496 lines)
- `README.md`: This documentation file
- `Sample/`: Example JSON files for pair and portfolio configurations

## Technology

Pure vanilla JavaScript, HTML, and CSS. No dependencies, no build step. Just open `index.html` in a browser.
