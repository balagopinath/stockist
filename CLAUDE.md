# Stockist — project guide for Claude Code

Stock portfolio manager. **AWS Amplify Gen 2** backend + **React (CRA)** + **Ant Design** frontend.
User trade data is owner-scoped (Cognito); master data (companies, industries, brokers…) is
admin-managed and readable by any signed-in user.

## Commands
- `npm install` — first-time setup.
- `npm start` — CRA dev server at http://localhost:3000.
- `npm run sandbox` — `ampx sandbox` (watch mode), writes `amplify_outputs.json` into `src/`.
- `npm run sandbox:once` — one-shot deploy. **Run this after editing `amplify/data/resource.ts`.**
- `npm run sandbox:delete` — tear down the sandbox.
- `npm run build` — production build.

CRA can't import from outside `src/`, which is why the sandbox writes outputs into `src/`.
The sandbox provisions **real AWS resources** in **ap-south-1** (visible in CloudFormation /
DynamoDB, stack `amplify-…-sandbox-…`). DynamoDB tables are named `Model-<apiId>-NONE`.

## Amplify data client conventions
- `import { generateClient } from 'aws-amplify/data'; const client = generateClient();`
- Models at `client.models.X`; `.list/.create/.update/.delete` return `{ data, errors }`.
  **create/update do NOT throw on error — always check `errors`.**
- `Amplify.configure` lives in `src/amplifyConfig.js`, imported first in `src/index.js` (fixes
  "Amplify has not been configured" ordering).
- Guard against undeployed models: `if (client.models.X)` / `const ENABLED = !!client.models.X`,
  so a not-yet-deployed schema change can't crash imports halfway.

## Domain model (`amplify/data/resource.ts`)
- **Masters** (admin write, authenticated read): `Industry` (self-referencing hierarchy + `level`),
  `Company` (name, ISIN, marketCap, industryId), `Exchange`, `Script` (company+exchange+code),
  `Broker` (charge rates), `DailyQuote`/`CurrentQuote`/`PriceUpload` (prices).
- **User data** (owner-scoped): `PortfolioItem` (benchmarkQty), `DashboardLayout`,
  `HoldingFIFO`, `HoldingSpecificLot` (+`recovering`), `RecoverySwing`
  (**`specificLotId` optional → null = naked short**), `TradeBook`/`TradeDetail`/`TradeLotAllocation`,
  `RecoveryEntry`, `ImportRun`, `ReconRun`/`ReconDiff`, `FundEntry`,
  `CapitalConfig`/`CapitalMonth`.

## Core concepts
- **Two parallel costing methods**: `HoldingFIFO` (naive, auto) and `HoldingSpecificLot`
  (user-chosen lots). They must have **equal total qty per company**; the Portfolio "Holding qty
  mismatch" watcher flags divergence. **Specific-lot is the source of truth**; FIFO is the naive
  method and does NOT model shorts.
- **Tradebook classification** (`src/tradebook.js` → `classifyTradebook`): nets buys/sells per
  **SYMBOL across exchanges** → `intraday` (round-tripped same day, P&L only, no holdings) vs
  `deliveryBuys`/`deliverySells` (leftover, hits holdings). Intraday shorts squared the same day
  net to intraday.
- **Recovery swings**: a delivery sell BELOW a lot's cost keeps the lot sticky (`recovering`) and
  opens an OPEN `RecoverySwing` (loss deferred). A later buy-back closes it, restores shares to the
  original lot at its ORIGINAL price, and books profit = (sellPrice − buyBackPrice) × qty. The
  buy-back flag auto-ticks only when buy price < the swing's sell price.
- **Naked shorts**: a delivery sell with no holding → `RecoverySwing` with `specificLotId = null`.
  Short qty = sold − held. Buy-back closes it (no lot to restore). FIFO can't represent shorts, so a
  short + buy-back leaves FIFO overstated (known limitation).
- **RecoveryEntry** = intraday-loss ledger (Loss Recovery screen) — distinct from RecoverySwing.
- **Charges** (`src/charges.js` → `computeCharges(broker, buys, sells, intra)`): Zerodha defaults.
- **Funds** = cash ledger. `TRADING` entries auto-created on import; `OPENING`/`DEPOSIT`/`WITHDRAWAL`
  manual. Withdrawals stored as negative amounts.
- **Capital Tracker**: `closing = opening × (1 + rate) + deposits − withdrawals`; deposits/withdrawals
  are pulled live from `FundEntry`.

## Import pipeline (important)
`DailyTrades.js` parses the broker CSV → `buildImportPlan()` → **`ImportSaver.js`** runs the save
**company-by-company** from a persisted `ImportRun` (resumable after failure/reload, per-company
rollback). `ImportWizard.js` is the stepped review dialog (Intraday / Buys / Sells / Review), with a
per-sell lot picker.

Tables **written** by an import: `ImportRun`, `TradeBook`, `TradeDetail`, `HoldingFIFO`,
`HoldingSpecificLot`, `TradeLotAllocation`, `RecoverySwing`, `RecoveryEntry`, `PortfolioItem`,
`FundEntry`. Read-only: `Company`/`Script`/`Exchange` (symbol→company), `Broker` (charges),
existing holdings/swings.

**Delete-import rollback** (`DailyTrades.openRollback`/`proceedRollback`): the specific-lot side is
reversed **exactly** (allocations are recorded), but the **FIFO side is best-effort** (FIFO
reductions aren't individually recorded) → it can leave phantom FIFO lots.
**Known gotcha:** importing the same day twice then deleting one leaves FIFO drift (FIFO > specific)
while specific-lot stays correct. Fix by clearing the stray `HoldingFIFO` rows.

## Key files
- `amplify/data/resource.ts` — schema
- `src/tradebook.js` — classifier · `src/charges.js` — charges
- `src/settings/DailyTrades.js` (~1700 lines) — import orchestration, history (monthly grouping),
  delete-import rollback
- `src/settings/ImportWizard.js` — stepped import dialog
- `src/settings/ImportSaver.js` — company-by-company saver
- `src/settings/Portfolio.js` — holdings grid + right-side watchers (mismatch, recovering)
- `src/settings/StockHistory.js` — tabbed company dialog (Delivery / Intraday / Lots / Recovery)
- `src/settings/Companies.js` — company master + CSV import/update/export
- `src/settings/Recovery.js`, `LotRecovery.js` — loss recovery
- `src/settings/Funds.js` — cash ledger · `src/settings/CapitalTracker.js` — capital tracker
- `src/settings/Brokers.js`, `Industries.js`, `Scripts.js`, `Exchanges.js`, `DailyPrices.js`,
  `ReconcileHoldings.js`, `DataBrowser.js`
- `src/pages/Dashboard.js` — dashboard widgets (buy-back opportunities, over-benchmark, etc.)
- `src/App.js` — routes · `src/layouts/SettingsLayout.js` — settings nav

## Gotchas & conventions
- Check `{ errors }` on every create/update (they don't throw).
- After any `resource.ts` change, run `npm run sandbox:once` before testing.
- NSE series suffix (`-BE`/`-BZ`/`-IL`): strip via `symbol.split('-')[0]` when matching.
- Market-cap class (large/mid/small) is **rank-based** (SEBI/AMFI top-100 / 101–250 / 251+),
  recomputed ~6-monthly — not a fixed formula.
- Money formatting: `₹` with `en-IN` locale, max 2 fraction digits.
- **DynamoDB PartiQL** (console): runs ONE statement at a time; **no JOIN**; `IN` only for SELECT
  with square-bracket lists (`IN ['a','b']`); DELETE must target the full primary key, one row per
  statement.

## Open ideas / backlog
- **Monthly reconciliation** feature: a pure recompute-from-trades engine, a read-only report, guided
  repairs ("Rebuild FIFO from specific/trades"), and a month-close checkpoint.
- **Duplicate same-day import guard** (warn if a `TradeBook` already exists for the date).
- Make FIFO rollback exact (record per-sell FIFO reductions).
- Dedicated **"Short positions"** widget (separate from recovery).

## Testing note
Verify frontend files compile with esbuild in transform mode (JSX): the project's files are large and
network-mounted; when a compile check is needed, copy the file, strip null bytes, and run esbuild.
