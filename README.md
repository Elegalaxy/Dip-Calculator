# Dip Calculator

A simple, vanilla HTML/CSS/JavaScript tool for planning crypto dip buy strategies. Calculate optimal entry points and allocations across multiple price levels.

## How to Run

This project requires no build step or dependencies. Simply open the HTML file in your web browser.

### Option 1: Direct File Open
1. Navigate to the project directory
2. Double-click `index.html` to open it in your default browser

### Option 2: Local Server (Recommended)
For better compatibility and to avoid CORS issues, use a local server:

**Using Python:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Using Node.js (http-server):**
```bash
npx http-server
```

**Using PHP:**
```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Option 3: VS Code Live Server
If using VS Code, install the "Live Server" extension and click "Go Live" in the status bar.

## Current Functionality

### Core Features

- **Pair Name Input**: Text field for trading pair (e.g., BTC/USDT)
- **Starting/Anchor Price**: Number input for reference price
- **Current Price**: Number input to track current market price
- **Coins Held**: Number input for existing coin holdings
- **Cash Available**: USD amount available for buying
- **Cash Deploy %**: Percentage of cash to allocate across dip levels

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

### Summary Calculations

- **Total Spend**: Sum of all buy amounts across levels
- **Remaining Cash**: Cash available minus total spend
- **Total Coins**: Existing holdings + all quantities from dip buys
- **Projected Avg Entry**: Weighted average entry price including existing holdings

### User Experience

- **Auto-save**: All inputs saved to localStorage
- **Reset Button**: Restores default values
- **Input Validation**: Clamps values to valid ranges
- **Warning Messages**: Alerts when total buy % exceeds 100%
- **Responsive Design**: Mobile-friendly layout
- **Real-time Calculations**: Updates on every input change

### Default State

- Pair: BTC/USDT
- Anchor Price: $60,000
- Current Price: $58,000
- Coins Held: 0.5
- Cash Available: $5,000
- Cash Deploy %: 80%
- 3 default levels: 5%, 10%, 15% dips with 20%, 30%, 50% allocations

## Usage

1. Enter your trading pair name
2. Set your anchor/starting price (reference point for dip calculations)
3. Enter current market price (used to highlight reached dip levels)
4. Input your existing coin holdings
5. Set available cash and deployment percentage
6. Configure dip levels with desired dip percentages and buy allocations
7. View summary calculations for total spend, remaining cash, total coins, and average entry price

All changes are automatically saved to your browser's localStorage.

## Future Plan

### Priority 1: Core Improvements

1. **Export/Import Functionality**
   - Export calculator state as JSON
   - Import saved scenarios
   - Share configurations via URL parameters

2. **Multiple Scenarios**
   - Save multiple named scenarios
   - Quick switch between scenarios
   - Scenario comparison view

3. **Enhanced Calculations**
   - Support for existing cost basis (currently assumes anchor price)
   - Profit/loss projections at different price targets
   - ROI calculations per level

### Priority 2: UX Enhancements

4. **Level Reordering**
   - Drag-and-drop to reorder levels
   - Sort by dip % or buy %

5. **Preset Templates**
   - Common strategies (conservative, aggressive, DCA)
   - Quick apply templates

6. **Better Visualizations**
   - Chart showing dip levels vs current price
   - Visual representation of allocation distribution

### Priority 3: Advanced Features

7. **Price Alerts**
   - Browser notifications when price hits dip levels
   - Requires price API integration (optional)

8. **Multi-Pair Support**
   - Track multiple pairs in one session
   - Tabbed interface for different pairs

9. **Historical Tracking**
   - Log executed buys
   - Track actual vs planned performance

### Technical Improvements

- Add unit tests for calculation functions
- Improve error handling for edge cases
- Add keyboard shortcuts for common actions
- Accessibility improvements (ARIA labels, keyboard navigation)

## Files Structure

- `index.html`: Main HTML structure with form inputs and summary section
- `app.js`: Core logic (331 lines) - state management, calculations, rendering
- `style.css`: Styling (222 lines) - responsive design, card-based layout
- `README.md`: This documentation file

## Technology

Pure vanilla JavaScript, HTML, and CSS. No dependencies, no build step. Just open `index.html` in a browser.
