// Tradebook classification engine.
//
// Takes raw fills and, per SYMBOL (netting ACROSS exchanges, the way the broker
// nets a scrip's day activity), FIFO-matches them chronologically:
//   - matched (round-tripped) quantity  -> INTRADAY (realized P&L, no holdings)
//   - net leftover                       -> DELIVERY buy or sell (hits holdings)
//
// Netting is across exchanges: a BSE buy can be squared against an NSE sell, so
// a scrip that's bought and sold the same total quantity in a day is a pure
// intraday wash even if the legs sat on different exchanges. Any leftover
// delivery still records the true exchange of the remaining lots, since actual
// settlement (and delivery charges) happen per exchange.
//
// A single symbol can only leave EITHER a net buy or a net sell (never both),
// because matching consumes the smaller side entirely.

export function classifyTradebook(fills) {
  const groups = {};
  fills.forEach((f) => {
    const k = f.symbol; // net across exchanges
    (groups[k] = groups[k] || []).push(f);
  });

  const intraday = [];
  const deliveryBuys = [];
  const deliverySells = [];

  for (const symbol of Object.keys(groups)) {
    const arr = groups[symbol]
      .slice()
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const isin = arr[0].isin;

    const longs = []; // open buys  { q, p, exchange }
    const shorts = []; // open sells { q, p, exchange }
    let pnl = 0;
    let matched = 0;
    let buyVal = 0;
    let sellVal = 0;

    // dominant exchange by traded quantity — used to label the intraday leg
    // (which no longer belongs to a single exchange once we net across them).
    const exQty = {};
    arr.forEach((f) => {
      exQty[f.exchange] = (exQty[f.exchange] || 0) + f.quantity;
    });
    const domExchange = Object.keys(exQty).sort((a, b) => exQty[b] - exQty[a])[0];

    for (const f of arr) {
      let q = f.quantity;
      const p = f.price;
      if (f.side === 'buy') {
        while (q > 0 && shorts.length) {
          const s = shorts[0];
          const m = Math.min(q, s.q);
          pnl += (s.p - p) * m; // covered a short: sold high, bought back
          matched += m;
          buyVal += m * p;
          sellVal += m * s.p;
          s.q -= m;
          q -= m;
          if (s.q <= 1e-9) shorts.shift();
        }
        if (q > 0) longs.push({ q, p, exchange: f.exchange });
      } else {
        while (q > 0 && longs.length) {
          const b = longs[0];
          const m = Math.min(q, b.q);
          pnl += (p - b.p) * m; // sold a long
          matched += m;
          buyVal += m * b.p;
          sellVal += m * p;
          b.q -= m;
          q -= m;
          if (b.q <= 1e-9) longs.shift();
        }
        if (q > 0) shorts.push({ q, p, exchange: f.exchange });
      }
    }

    if (matched > 1e-9) {
      intraday.push({
        symbol,
        exchange: domExchange,
        isin,
        qty: matched,
        avgBuy: buyVal / matched,
        avgSell: sellVal / matched,
        pnl,
      });
    }

    // Leftover delivery keeps the real exchange of each remaining lot, since
    // settlement/delivery charges are per exchange. Aggregate per exchange.
    const aggByExchange = (lots) => {
      const m = {};
      lots.forEach((l) => {
        const g = (m[l.exchange] = m[l.exchange] || { qty: 0, val: 0 });
        g.qty += l.q;
        g.val += l.q * l.p;
      });
      return m;
    };

    const bl = aggByExchange(longs);
    Object.keys(bl).forEach((ex) => {
      if (bl[ex].qty > 1e-9) {
        deliveryBuys.push({ symbol, exchange: ex, isin, qty: bl[ex].qty, price: bl[ex].val / bl[ex].qty });
      }
    });

    const sl = aggByExchange(shorts);
    Object.keys(sl).forEach((ex) => {
      if (sl[ex].qty > 1e-9) {
        deliverySells.push({ symbol, exchange: ex, isin, qty: sl[ex].qty, price: sl[ex].val / sl[ex].qty });
      }
    });
  }

  return { intraday, deliveryBuys, deliverySells };
}
