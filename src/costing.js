// Lot-based costing engine.
//
// Replays a user's trades into open lots and computes remaining quantity and
// weighted-average cost, under two methods:
//   - 'FIFO'     : each sell consumes the oldest open buy lots first.
//   - 'SPECIFIC' : each sell consumes the lots named in its `allocations`
//                  ([{ buyTradeId, quantity }]); falls back to FIFO for any
//                  sell that has no allocations.
//
// Lots are tracked per Script (you can't sell an NSE lot from a BSE buy).
// Holdings then roll up per Company across that company's scripts.

const byTime = (a, b) => {
  const ta = new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime();
  if (ta !== 0) return ta;
  return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
};

// Open buy lots remaining for ONE script's trades, under the given method.
// Returns [{ tradeId, price, remaining }] with remaining > 0.
export function openLotsForScript(trades, method, { excludeSellId } = {}) {
  const buys = trades
    .filter((t) => t.side === 'BUY')
    .sort(byTime)
    .map((t) => ({
      tradeId: t.id,
      price: t.price,
      date: t.tradedAt,
      remaining: t.quantity,
    }));
  const lotById = {};
  buys.forEach((l) => (lotById[l.tradeId] = l));

  const sells = trades
    .filter((t) => t.side === 'SELL' && t.id !== excludeSellId)
    .sort(byTime);

  for (const sell of sells) {
    let toSell = sell.quantity;
    const alloc = Array.isArray(sell.allocations) ? sell.allocations : null;

    if (method === 'SPECIFIC' && alloc && alloc.length) {
      for (const a of alloc) {
        const lot = lotById[a.buyTradeId];
        if (!lot) continue;
        const take = Math.min(lot.remaining, a.quantity, toSell);
        lot.remaining -= take;
        toSell -= take;
      }
    }
    // FIFO, or leftover after specific allocations
    if (toSell > 0) {
      for (const lot of buys) {
        if (toSell <= 0) break;
        if (lot.remaining <= 0) continue;
        const take = Math.min(lot.remaining, toSell);
        lot.remaining -= take;
        toSell -= take;
      }
    }
  }
  return buys.filter((l) => l.remaining > 1e-9);
}

// Weighted average cost + qty from a set of open lots.
function aggregate(lots) {
  let qty = 0;
  let cost = 0;
  for (const l of lots) {
    qty += l.remaining;
    cost += l.remaining * l.price;
  }
  return { qty, avgCost: qty > 0 ? cost / qty : 0, invested: cost };
}

// Compute holdings per company under a method, pooling all of a company's
// scripts together (portfolio is exchange-agnostic) and folding in an
// optional opening balance as the oldest lot.
//
//   trades:       all of the user's Trade records
//   scriptById:   { [scriptId]: { companyId } }
//   method:       'FIFO' | 'SPECIFIC'
//   openingByCompany: { [companyId]: { qty, avgCost } }  (optional)
//
// Returns Map companyId -> { qty, avgCost, invested }.
export function holdingsByCompany(trades, scriptById, method, openingByCompany = {}) {
  const byCompany = {};
  trades.forEach((t) => {
    const cid = scriptById[t.scriptId]?.companyId;
    if (!cid) return;
    (byCompany[cid] = byCompany[cid] || []).push(t);
  });
  // companies that have only an opening balance still count
  Object.keys(openingByCompany).forEach((cid) => {
    byCompany[cid] = byCompany[cid] || [];
  });

  const out = new Map();
  for (const cid of Object.keys(byCompany)) {
    const cTrades = byCompany[cid];
    const opening = openingByCompany[cid];

    const lots = [];
    if (opening && opening.qty > 1e-9) {
      lots.push({
        tradeId: `opening:${cid}`,
        price: opening.avgCost,
        date: '1970-01-01T00:00:00.000Z', // oldest, so FIFO uses it first
        remaining: opening.qty,
      });
    }
    cTrades
      .filter((t) => t.side === 'BUY')
      .sort(byTime)
      .forEach((t) =>
        lots.push({
          tradeId: t.id,
          price: t.price,
          date: t.tradedAt,
          remaining: t.quantity,
        })
      );
    const lotById = Object.fromEntries(lots.map((l) => [l.tradeId, l]));

    cTrades
      .filter((t) => t.side === 'SELL')
      .sort(byTime)
      .forEach((sell) => {
        let toSell = sell.quantity;
        const alloc = Array.isArray(sell.allocations) ? sell.allocations : null;
        if (method === 'SPECIFIC' && alloc && alloc.length) {
          for (const a of alloc) {
            const lot = lotById[a.buyTradeId];
            if (!lot) continue;
            const take = Math.min(lot.remaining, a.quantity, toSell);
            lot.remaining -= take;
            toSell -= take;
          }
        }
        if (toSell > 0) {
          for (const lot of lots) {
            if (toSell <= 0) break;
            if (lot.remaining <= 0) continue;
            const take = Math.min(lot.remaining, toSell);
            lot.remaining -= take;
            toSell -= take;
          }
        }
      });

    let qty = 0;
    let cost = 0;
    for (const l of lots) {
      if (l.remaining <= 1e-9) continue;
      qty += l.remaining;
      cost += l.remaining * l.price;
    }
    if (qty > 1e-9) {
      out.set(cid, { qty, avgCost: cost / qty, invested: cost });
    }
  }
  return out;
}

export { aggregate };
