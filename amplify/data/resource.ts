import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Data schema — built up one feature at a time.
 *
 * Masters (admin-only):
 *   Industry — self-referencing hierarchy. Each industry may have a parent
 *              (parentId), giving Sector → Industry → Sub-industry. A null
 *              parent means it's a top-level node.
 *   Company  — listed company. name + ISIN required, marketCap optional.
 *   Exchange — stock exchange. name + code required (e.g. NSE, BSE).
 *   Script   — a listed ticker: belongs to one Company and one Exchange,
 *              with a code (e.g. INFY). The bridge between the masters.
 *
 * User data (owner-scoped, each user sees only their own):
 *   Trade         — a buy or sell on a Script (listing): quantity, price,
 *                   date. For a SELL, `allocations` records which buy lots it
 *                   draws from (specific-lot) as [{ buyTradeId, quantity }].
 *   PortfolioItem — an OPENING BALANCE per company: shares already held
 *                   before using the app (quantity + avgPrice). Final
 *                   holdings = opening balance + trades, both feeding the
 *                   FIFO / specific-lot costing.
 *
 * Access: masters are readable by any signed-in user but only writable by
 * the "admin" group. Trades and PortfolioItems are private to their owner.
 * @see https://docs.amplify.aws/react/build-a-backend/data/
 */
const schema = a.schema({
  Industry: a
    .model({
      name: a.string().required(),
      code: a.string(),
      // depth in the hierarchy: 0 = top level, up to 4 = Basic Industry.
      // Stored (not just derived) so it can be used for filtering/queries.
      level: a.integer(),
      parentId: a.id(),
      parent: a.belongsTo('Industry', 'parentId'),
      subIndustries: a.hasMany('Industry', 'parentId'),
      companies: a.hasMany('Company', 'industryId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  Company: a
    .model({
      name: a.string().required(),
      ISIN: a.string().required(),
      marketCap: a.float(),
      industryId: a.id(),
      industry: a.belongsTo('Industry', 'industryId'),
      scripts: a.hasMany('Script', 'companyId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  Exchange: a
    .model({
      name: a.string().required(),
      code: a.string().required(),
      scripts: a.hasMany('Script', 'exchangeId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  // Broker + its charge rates (percentages of turnover unless noted).
  // Statutory rates are the same across brokers; brokerage/DP differ.
  Broker: a
    .model({
      name: a.string().required(),
      brokerageDeliveryPct: a.float(),
      brokerageIntradayPct: a.float(),
      brokerageIntradayMax: a.float(), // per-order cap (₹)
      sttDeliveryPct: a.float(), // each side
      sttIntradayPct: a.float(), // sell side
      exchTxnNsePct: a.float(),
      exchTxnBsePct: a.float(),
      sebiPct: a.float(),
      stampDeliveryPct: a.float(), // buy side
      stampIntradayPct: a.float(), // buy side
      gstPct: a.float(),
      dpFlat: a.float(), // ₹ per scrip on delivery sell
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  Script: a
    .model({
      code: a.string().required(),
      companyId: a.id().required(),
      company: a.belongsTo('Company', 'companyId'),
      exchangeId: a.id().required(),
      exchange: a.belongsTo('Exchange', 'exchangeId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  // The set of companies in the user's portfolio.
  //   benchmarkQty = target quantity to maintain (guides buy-back after sells).
  PortfolioItem: a
    .model({
      companyId: a.id().required(),
      benchmarkQty: a.float(),
    })
    // owners manage their own; admins may READ across users (for master-data
    // oversight, e.g. finding portfolio companies missing an industry).
    .authorization((allow) => [allow.owner(), allow.group('admin').to(['read'])]),

  // A user dashboard (they can have several). Each holds its widget layout.
  //   widgets = [{ i, type, x, y, w, h }]
  DashboardLayout: a
    .model({
      name: a.string(),
      widgets: a.json(),
    })
    .authorization((allow) => [allow.owner()]),

  // Current open lots under FIFO — one row per lot (child of a company).
  //   quantity   = shares originally bought in this lot
  //   balanceQty = shares still held after sells (starts equal to quantity)
  //   soldOut    = true once balanceQty reaches 0 (lets us skip closed lots)
  HoldingFIFO: a
    .model({
      companyId: a.id().required(),
      buyDate: a.date().required(),
      quantity: a.float().required(),
      balanceQty: a.float().required(),
      avgPrice: a.float().required(),
      soldOut: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner()]),

  // Current open lots under specific-lot method — same shape.
  //   recovering = true keeps a losing lot "sticky": it stays in holdings even
  //   when short-traded down to zero balance, so it can be recovered via swings.
  HoldingSpecificLot: a
    .model({
      companyId: a.id().required(),
      buyDate: a.date().required(),
      quantity: a.float().required(),
      balanceQty: a.float().required(),
      avgPrice: a.float().required(),
      soldOut: a.boolean().default(false),
      recovering: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner()]),

  // A short-trade "swing" against a specific (loss) lot to recover its loss:
  // sell now, buy back cheaper later. While OPEN the shares are out and cash is
  // realized; buying back CLOSES it with profit = (sell − buyback) × qty and
  // returns the shares to the lot at its ORIGINAL price. The user may instead
  // CLOSE it manually (give up on the buy-back) — shares stay gone.
  // Also used for NAKED SHORTS: a short sell (sell with no holding) opens a
  // swing with specificLotId = null. Buying it back closes it the same way as a
  // recovery buy-back (profit = sell − buyback), just with no lot to restore
  // shares to.
  RecoverySwing: a
    .model({
      companyId: a.id().required(),
      specificLotId: a.id(), // null = naked short (no underlying lot)
      qty: a.float().required(),
      sellPrice: a.float().required(),
      sellDate: a.date(),
      status: a.enum(['OPEN', 'CLOSED']),
      closeType: a.enum(['BUYBACK', 'MANUAL']),
      buyBackPrice: a.float(),
      buyBackDate: a.date(),
      profit: a.float(),
      note: a.string(),
      // the TradeDetail rows that opened (sell) / closed (buy-back) this swing,
      // so the trade history can tag them.
      openTradeDetailId: a.id(),
      closeTradeDetailId: a.id(),
    })
    .authorization((allow) => [allow.owner()]),

  // End-of-day price history — one row per company per trading day.
  // Primary key (companyId, date) → natural dedup + "history per company".
  DailyQuote: a
    .model({
      companyId: a.id().required(),
      date: a.date().required(),
      open: a.float(),
      high: a.float(),
      low: a.float(),
      close: a.float(),
      ltp: a.float(),
      prevClose: a.float(),
      volume: a.float(),
      tradedValue: a.float(),
    })
    .identifier(['companyId', 'date'])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  // A log of each daily-price (bhavcopy) upload — for history/audit.
  PriceUpload: a
    .model({
      date: a.date().required(),
      quotes: a.integer(),
      skipped: a.integer(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  // Latest price snapshot — exactly one row per company (companyId is the key).
  // Refreshed on each daily import (only when the file's date is newer).
  CurrentQuote: a
    .model({
      companyId: a.id().required(),
      asOfDate: a.date().required(),
      ltp: a.float(),
      close: a.float(),
      prevClose: a.float(),
      volume: a.float(),
    })
    .identifier(['companyId'])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('admin'),
    ]),

  // --- Trades (owner-private) ---------------------------------------------
  // TradeBook = one header per trading day; TradeDetail = one processed
  // movement (delivery buy/sell or intraday) per company+exchange;
  // TradeLotAllocation = M:N link between a sell detail and the specific
  // lots it consumed (and OPEN link for the lot a buy created).
  TradeBook: a
    .model({
      tradeDate: a.date().required(),
      realizedPnl: a.float(),
      note: a.string(),
      buyCount: a.integer(),
      sellCount: a.integer(),
      intradayCount: a.integer(),
      brokerId: a.id(),
      charges: a.float(),
      chargesBreakdown: a.json(),
    })
    .authorization((allow) => [allow.owner()]),

  TradeDetail: a
    .model({
      tradeBookId: a.id().required(),
      companyId: a.id().required(),
      symbol: a.string(),
      exchange: a.string(),
      tradeType: a.enum(['DELIVERY', 'INTRADAY']),
      side: a.enum(['BUY', 'SELL']),
      quantity: a.float().required(),
      price: a.float(),
      avgBuy: a.float(),
      avgSell: a.float(),
      realizedPnl: a.float(),
    })
    .authorization((allow) => [allow.owner()]),

  TradeLotAllocation: a
    .model({
      tradeDetailId: a.id().required(),
      specificLotId: a.id().required(),
      quantity: a.float().required(),
      kind: a.enum(['OPEN', 'REDUCE']),
    })
    .authorization((allow) => [allow.owner()]),

  // Outstanding intraday loss to recover against a stock. Auto-created on an
  // intraday loss; the user reduces/deletes it as later profits recover it.
  RecoveryEntry: a
    .model({
      companyId: a.id().required(),
      amount: a.float().required(),
      incurredOn: a.date(),
      note: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  // A resumable tradebook-import job. Saved when the user hits Proceed so the
  // save can be watched company-by-company and resumed after a failure — even
  // across a page reload — without re-uploading or re-choosing lots.
  //   plan     = { tradeDate, brokerId, charges, totalPnl, fundNet, companies:[...] }
  //   progress = { setup:{status,bookId}, companies:{ [companyId]:{status,error,created} },
  //                finalize:{status} }
  ImportRun: a
    .model({
      tradeDate: a.date().required(),
      status: a.enum(['RUNNING', 'DONE', 'ERROR']),
      plan: a.json(),
      progress: a.json(),
      brokerId: a.id(),
    })
    .authorization((allow) => [allow.owner()]),

  // A saved reconciliation run (app vs broker) with its per-stock differences.
  ReconRun: a
    .model({
      runAt: a.datetime().required(),
      source: a.string(),
      comparedCount: a.integer(),
      diffCount: a.integer(),
    })
    .authorization((allow) => [allow.owner()]),

  ReconDiff: a
    .model({
      reconRunId: a.id().required(),
      symbol: a.string(),
      appQty: a.float(),
      brokerQty: a.float(),
      qtyDiff: a.float(),
      appInvested: a.float(),
      brokerInvested: a.float(),
      investedDiff: a.float(),
      status: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  // --- Capital tracker (owner-private) ------------------------------------
  // Models the invested capital as a balance that "earns" a fixed monthly rate
  // (like a loan at monthlyRatePct/month). Each month:
  //   closing = opening × (1 + rate) − withdrawal
  // So withdrawing exactly the interest keeps capital flat; withdrawing more
  // shrinks it; withdrawing less (or nothing) grows it. The month's trading
  // P&L is pulled from the tradebooks for reference and to default the
  // withdrawal, but the recurrence itself uses the fixed rate.
  //   One config row per user (first one wins).
  CapitalConfig: a
    .model({
      initialCapital: a.float().required(),
      monthlyRatePct: a.float().required(), // e.g. 2 = 2% / month
      startMonth: a.string().required(), // 'YYYY-MM'
    })
    .authorization((allow) => [allow.owner()]),

  // One row per tracked month (only created when the user records something).
  //   withdrawal     = cash taken out that month
  //   profitOverride = if set, used instead of the auto tradebook P&L (display)
  CapitalMonth: a
    .model({
      month: a.string().required(), // 'YYYY-MM'
      withdrawal: a.float(),
      profitOverride: a.float(),
      note: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  // Cash ledger. amount is SIGNED: + = added, − = deducted.
  //   OPENING — starting cash balance (one entry, editable)
  //   DEPOSIT / WITHDRAWAL — manual external cash movements
  //   TRADING — net cash from a day's trades (sells + intraday profit are +,
  //             buys + intraday loss are −), auto-created on processing.
  FundEntry: a
    .model({
      date: a.date().required(),
      type: a.enum(['OPENING', 'DEPOSIT', 'WITHDRAWAL', 'TRADING']),
      amount: a.float().required(),
      note: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  // Signed-in (Cognito) users only — the frontend is wrapped in <Authenticator>.
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
