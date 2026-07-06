// Tradebook classification engine.
//
// Takes raw fills and, per (symbol, exchange), FIFO-matches them chronologically:
//   - matched (round-tripped) quantity  -> INTRADAY (realized P&L, no holdings)
//   - net leftover                       -> DELIVERY buy or sell (hits holdings)
//
// A single symbol+exchange can only leave EITHER a net buy or a net sell
// (never both), because matching consumes the smaller side entirely.

export function classifyTradebook(fills) {
  const groups = {};
  fills.forEach((f) => {
    const k = `${f.symbol}|${f.exchange}`;
    (groups[k] = groups[k] || []).push(f);
  });

  const intraday = [];
  const deliveryBuys = [];
  const deliverySells = [];

  for (const key of Object.keys(groups)) {
    const [symbol, exchange] = key.split('|');
    const arr = groups[key]
      .slice()
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const isin = arr[0].isin;

    const longs = []; // open buys  { q, p }
    const shorts = []; // open sells { q, p }
    let pnl = 0;
    let matched = 0;
    let buyVal = 0;
    let sellVal = 0;

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
        if (q > 0) longs.push({ q, p });
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
        if (q > 0) shorts.push({ q, p });
      }
    }

    if (matched > 1e-9) {
      intraday.push({
        symbol,
        exchange,
        isin,
        qty: matched,
        avgBuy: buyVal / matched,
        avgSell: sellVal / matched,
        pnl,
      });
    }

    const buyLeft = longs.reduce((s, l) => s + l.q, 0);
    const buyLeftVal = longs.reduce((s, l) => s + l.q * l.p, 0);
    const sellLeft = shorts.reduce((s, l) => s + l.q, 0);
    const sellLeftVal = shorts.reduce((s, l) => s + l.q * l.p, 0);

    if (buyLeft > 1e-9) {
      deliveryBuys.push({ symbol, exchange, isin, qty: buyLeft, price: buyLeftVal / buyLeft });
    }
    if (sellLeft > 1e-9) {
      deliverySells.push({ symbol, exchange, isin, qty: sellLeft, price: sellLeftVal / sellLeft });
    }
  }

  return { intraday, deliveryBuys, deliverySells };
}
