// Charge/tax calculator. Rates on the broker are PERCENTAGES of turnover
// (e.g. sttDeliveryPct = 0.1 means 0.1%). Netted movements are used, so the
// result is an estimate (per-fill brokerage caps can't be exact after netting).

const pct = (v) => (v || 0) / 100;

// Zerodha-style defaults (editable in the Broker master). Approximate — verify
// against your latest contract note.
export const ZERODHA_DEFAULTS = {
  name: 'Zerodha',
  brokerageDeliveryPct: 0, // ₹0 on equity delivery
  brokerageIntradayPct: 0.03, // 0.03% or ₹20/order, lower
  brokerageIntradayMax: 20,
  sttDeliveryPct: 0.1, // each side
  sttIntradayPct: 0.025, // sell side
  exchTxnNsePct: 0.00297,
  exchTxnBsePct: 0.00375,
  sebiPct: 0.0001,
  stampDeliveryPct: 0.015, // buy side
  stampIntradayPct: 0.003, // buy side
  gstPct: 18,
  dpFlat: 15.93, // ₹ per scrip on delivery sell (incl. GST)
};

// buys / sells: [{ qty, price, exchange }]
// intra: [{ qty, avgBuy, avgSell, exchange }]
export function computeCharges(broker, buys, sells, intra) {
  const txn = (ex) => pct(ex === 'BSE' ? broker.exchTxnBsePct : broker.exchTxnNsePct);
  let brokerage = 0;
  let stt = 0;
  let exch = 0;
  let sebi = 0;
  let stamp = 0;
  let dp = 0;

  for (const b of buys) {
    const to = b.qty * b.price;
    brokerage += to * pct(broker.brokerageDeliveryPct);
    stt += to * pct(broker.sttDeliveryPct);
    exch += to * txn(b.exchange);
    sebi += to * pct(broker.sebiPct);
    stamp += to * pct(broker.stampDeliveryPct);
  }
  for (const s of sells) {
    const to = s.qty * s.price;
    brokerage += to * pct(broker.brokerageDeliveryPct);
    stt += to * pct(broker.sttDeliveryPct);
    exch += to * txn(s.exchange);
    sebi += to * pct(broker.sebiPct);
    dp += broker.dpFlat || 0;
  }
  for (const m of intra) {
    const buyTo = m.qty * m.avgBuy;
    const sellTo = m.qty * m.avgSell;
    const bMax = broker.brokerageIntradayMax || Infinity;
    brokerage += Math.min(buyTo * pct(broker.brokerageIntradayPct), bMax);
    brokerage += Math.min(sellTo * pct(broker.brokerageIntradayPct), bMax);
    stt += sellTo * pct(broker.sttIntradayPct);
    exch += (buyTo + sellTo) * txn(m.exchange);
    sebi += (buyTo + sellTo) * pct(broker.sebiPct);
    stamp += buyTo * pct(broker.stampIntradayPct);
  }

  // GST applies to brokerage + exchange txn + SEBI + DP
  const gst = (brokerage + exch + sebi + dp) * pct(broker.gstPct);
  const total = brokerage + stt + exch + sebi + stamp + dp + gst;

  const r2 = (x) => Math.round(x * 100) / 100;
  return {
    brokerage: r2(brokerage),
    stt: r2(stt),
    exchTxn: r2(exch),
    sebi: r2(sebi),
    stamp: r2(stamp),
    dp: r2(dp),
    gst: r2(gst),
    total: r2(total),
  };
}
