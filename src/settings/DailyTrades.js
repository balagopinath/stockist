import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Typography,
  Button,
  Space,
  Upload,
  Alert,
  Progress,
  Statistic,
  Card,
  Table,
  Tag,
  Modal,
  Divider,
  Select,
  Descriptions,
  Checkbox,
  Tooltip,
  message,
} from 'antd';
import { classifyTradebook } from '../tradebook';
import { computeCharges } from '../charges';
import ImportWizard from './ImportWizard';
import ImportSaver from './ImportSaver';

const client = generateClient();

// Recovery features depend on the RecoverySwing model being deployed. If it
// isn't (schema not yet pushed), fall back to normal delivery-sell handling so
// the import can't crash half-way trying to create a swing on an undefined model.
const RECOVERY_ENABLED = !!client.models.RecoverySwing;

function pick(row, key) {
  const found = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === key.toLowerCase()
  );
  return found ? String(row[found] ?? '').trim() : '';
}
const num = (v) => {
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function listAll(model, filter) {
  let all = [];
  let nextToken = null;
  do {
    const { data, nextToken: nt, errors } =
      await model.list({ limit: 1000, nextToken, ...(filter ? { filter } : {}) });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    all = all.concat(data);
    nextToken = nt;
  } while (nextToken);
  return all;
}

export default function DailyTrades() {
  const [companies, setCompanies] = useState([]);
  const [fifoLots, setFifoLots] = useState([]);
  const [specLots, setSpecLots] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [brokerId, setBrokerId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tradeDate, setTradeDate] = useState(null);
  const [buys, setBuys] = useState([]);
  const [sells, setSells] = useState([]);
  const [intra, setIntra] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [allocs, setAllocs] = useState({}); // { sellIndex: { lotId: qty } }

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [procError, setProcError] = useState(null); // sticky import error banner

  // history of processed daily trades
  const [books, setBooks] = useState([]);
  const [details, setDetails] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [allSpec, setAllSpec] = useState([]); // all lots incl. sold-out, for lot lookup
  const [viewBook, setViewBook] = useState(null);
  const [recalcBrokerId, setRecalcBrokerId] = useState(null);
  const [recalcSaving, setRecalcSaving] = useState(false);

  // all recovery swings (open ones drive buy-back matching; closed ones tag history)
  const [recSwings, setRecSwings] = useState([]);
  // per-buy "treat as buy-back" choices, keyed by buy row index
  const [buyBackFlags, setBuyBackFlags] = useState({});

  // import wizard
  const [importOpen, setImportOpen] = useState(false);
  // company-by-company saver
  const [saverPlan, setSaverPlan] = useState(null);
  const [saverRun, setSaverRun] = useState(null);
  const [saverOpen, setSaverOpen] = useState(false);
  const [pendingRuns, setPendingRuns] = useState([]);

  // delete-import (rollback) dialog
  const [rollback, setRollback] = useState(null); // { book, loading, impact, plan, proceeding }

  // edit a delivery-sell's specific-lot allocation
  const [editSell, setEditSell] = useState(null);
  const [editOrig, setEditOrig] = useState({}); // original alloc { lotId: qty }
  const [editAllocs, setEditAllocs] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      if (!client.models.TradeBook) {
        message.error('Trade models not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      const active = { soldOut: { ne: true } };
      const [co, f, s, pf, tb, td, al, allS, br, sw, ir] = await Promise.all([
        listAll(client.models.Company),
        listAll(client.models.HoldingFIFO, active),
        listAll(client.models.HoldingSpecificLot, active),
        listAll(client.models.PortfolioItem),
        listAll(client.models.TradeBook),
        listAll(client.models.TradeDetail),
        listAll(client.models.TradeLotAllocation),
        listAll(client.models.HoldingSpecificLot),
        client.models.Broker ? listAll(client.models.Broker) : [],
        client.models.RecoverySwing ? listAll(client.models.RecoverySwing) : [],
        client.models.ImportRun ? listAll(client.models.ImportRun) : [],
      ]);
      setCompanies(co);
      setFifoLots(f);
      setSpecLots(s);
      setPortfolio(pf);
      setBooks(tb);
      setDetails(td);
      setAllocations(al);
      setAllSpec(allS);
      setBrokers(br);
      setRecSwings(sw);
      setPendingRuns((ir || []).filter((r) => r.status !== 'DONE'));
      // default the broker picker to Zerodha, else the first broker
      setBrokerId((prev) => {
        if (prev && br.some((b) => b.id === prev)) return prev;
        const z = br.find((b) => (b.name || '').toLowerCase() === 'zerodha');
        return z ? z.id : br[0]?.id ?? null;
      });
    } catch (e) {
      message.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // when opening a tradebook, default its recalc broker to the one it used,
  // else the page's selected/default broker
  useEffect(() => {
    if (viewBook) setRecalcBrokerId(viewBook.brokerId || brokerId || null);
  }, [viewBook, brokerId]);

  // rebuild the day's movements from stored details and recompute charges for
  // the chosen broker; save onto the tradebook and adjust the TRADING fund entry
  async function recalcCharges() {
    if (!viewBook) return;
    const broker = brokerById[recalcBrokerId];
    if (!broker) return message.error('Choose a broker first.');
    const bd = detailsByBook[viewBook.id] || [];
    const rbuys = bd
      .filter((d) => d.tradeType === 'DELIVERY' && d.side === 'BUY')
      .map((d) => ({ qty: d.quantity, price: d.price, exchange: d.exchange }));
    const rsells = bd
      .filter((d) => d.tradeType === 'DELIVERY' && d.side === 'SELL')
      .map((d) => ({ qty: d.quantity, price: d.price, exchange: d.exchange }));
    const rintra = bd
      .filter((d) => d.tradeType === 'INTRADAY')
      .map((d) => ({ qty: d.quantity, avgBuy: d.avgBuy, avgSell: d.avgSell, exchange: d.exchange }));
    const ch = computeCharges(broker, rbuys, rsells, rintra);
    setRecalcSaving(true);
    try {
      await client.models.TradeBook.update({
        id: viewBook.id,
        brokerId: recalcBrokerId,
        charges: ch.total,
        chargesBreakdown: JSON.stringify(ch),
      });
      // adjust the day's TRADING fund entry by the change in charges
      // (charges up → cash down). delta accounts for any prior charges.
      const delta = (viewBook.charges || 0) - ch.total;
      if (client.models.FundEntry && Math.abs(delta) > 1e-6) {
        const fes = await listAll(client.models.FundEntry, {
          and: [{ date: { eq: viewBook.tradeDate } }, { type: { eq: 'TRADING' } }],
        });
        if (fes.length) {
          await client.models.FundEntry.update({
            id: fes[0].id,
            amount: (fes[0].amount || 0) + delta,
          });
        }
      }
      message.success(`Charges recalculated: ${money(ch.total)}.`);
      setViewBook({
        ...viewBook,
        brokerId: recalcBrokerId,
        charges: ch.total,
        chargesBreakdown: JSON.stringify(ch),
      });
      load();
    } catch (e) {
      message.error(`Recalculation failed: ${e.message}`);
    } finally {
      setRecalcSaving(false);
    }
  }

  const isinToCompany = useMemo(() => {
    const m = {};
    companies.forEach((c) => {
      if (c.ISIN) m[c.ISIN.toLowerCase()] = c;
    });
    return m;
  }, [companies]);

  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  );

  const brokerById = useMemo(
    () => Object.fromEntries(brokers.map((b) => [b.id, b])),
    [brokers]
  );

  // history: the latest month shows day-by-day; earlier months collapse into a
  // monthly summary that expands to that month's days.
  const historyRows = useMemo(() => {
    const monthOf = (d) => (d || '').slice(0, 7); // YYYY-MM
    const byMonth = {};
    books.forEach((b) => {
      const mo = monthOf(b.tradeDate);
      if (!mo) return;
      (byMonth[mo] = byMonth[mo] || []).push(b);
    });
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = Object.keys(byMonth).sort().reverse(); // newest month first
    const byDateDesc = (a, b) => (a.tradeDate < b.tradeDate ? 1 : -1);
    const rows = [];
    // current calendar month → daily rows
    (byMonth[currentMonth] || []).sort(byDateDesc).forEach((b) => rows.push(b));
    // every earlier month → one summary row each (expandable to its days)
    months
      .filter((mo) => mo !== currentMonth)
      .forEach((mo) => {
      const entries = [...byMonth[mo]].sort(byDateDesc);
      const agg = entries.reduce(
        (a, e) => ({
          buyCount: a.buyCount + (e.buyCount || 0),
          sellCount: a.sellCount + (e.sellCount || 0),
          intradayCount: a.intradayCount + (e.intradayCount || 0),
          realizedPnl: a.realizedPnl + (e.realizedPnl || 0),
          charges: a.charges + (e.charges || 0),
        }),
        { buyCount: 0, sellCount: 0, intradayCount: 0, realizedPnl: 0, charges: 0 }
      );
      rows.push({ _month: mo, entries, ...agg });
    });
    return rows;
  }, [books]);
  const detailsByBook = useMemo(() => {
    const m = {};
    details.forEach((d) => (m[d.tradeBookId] = m[d.tradeBookId] || []).push(d));
    return m;
  }, [details]);

  const allocByDetail = useMemo(() => {
    const m = {};
    allocations.forEach((a) => (m[a.tradeDetailId] = m[a.tradeDetailId] || []).push(a));
    return m;
  }, [allocations]);

  const specById = useMemo(
    () => Object.fromEntries(allSpec.map((l) => [l.id, l])),
    [allSpec]
  );

  // category summary (buy / sell / intraday) for the book being viewed
  const catData = useMemo(() => {
    if (!viewBook) return [];
    const bd = detailsByBook[viewBook.id] || [];
    const groups = [
      { key: 'DB', label: 'Delivery Buy', items: bd.filter((d) => d.tradeType === 'DELIVERY' && d.side === 'BUY') },
      { key: 'DS', label: 'Delivery Sell', items: bd.filter((d) => d.tradeType === 'DELIVERY' && d.side === 'SELL') },
      { key: 'ID', label: 'Intraday', items: bd.filter((d) => d.tradeType === 'INTRADAY') },
    ];
    return groups.map((g) => ({
      key: g.key,
      label: g.label,
      count: g.items.length,
      qty: g.items.reduce((s, d) => s + (d.quantity || 0), 0),
      pnl: g.items.reduce((s, d) => s + (d.realizedPnl || 0), 0),
      items: g.items,
    }));
  }, [viewBook, detailsByBook]);

  const pnlSpan = (v) =>
    v == null ? (
      '—'
    ) : (
      <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{money(v)}</span>
    );

  // ---- edit lot allocation of a delivery sell ------------------------------

  function openEditLots(detail) {
    const orig = {};
    (allocByDetail[detail.id] || [])
      .filter((a) => a.kind === 'REDUCE')
      .forEach((a) => (orig[a.specificLotId] = a.quantity));
    setEditSell(detail);
    setEditOrig(orig);
    setEditAllocs({ ...orig });
  }
  // shares of a lot available to this edit = its current balance + what this
  // trade already holds from it (restored when re-allocating)
  const editAvail = (lot) => (lot.balanceQty ?? lot.quantity) + (editOrig[lot.id] || 0);
  const editTotal = () =>
    Object.values(editAllocs).reduce((s, v) => s + (Number(v) || 0), 0);
  const editPnl = () =>
    Object.entries(editAllocs).reduce((s, [lotId, q]) => {
      const lot = specById[lotId];
      return s + (lot ? (editSell.price - lot.avgPrice) * (Number(q) || 0) : 0);
    }, 0);

  function chooseEditLot(lot) {
    const remaining = editSell.quantity - editTotal();
    if (remaining <= 0) return;
    const free = editAvail(lot) - (editAllocs[lot.id] || 0);
    const take = Math.min(free, remaining);
    if (take <= 0) return;
    setEditAllocs((p) => ({ ...p, [lot.id]: (p[lot.id] || 0) + take }));
  }
  function unchooseEditLot(lotId) {
    setEditAllocs((p) => {
      const c = { ...p };
      delete c[lotId];
      return c;
    });
  }

  async function saveEditLots() {
    const sell = editSell;
    if (Math.abs(editTotal() - sell.quantity) > 1e-6) {
      return message.error(`Allocate exactly ${sell.quantity} share(s).`);
    }
    setEditSaving(true);
    try {
      const rowByLot = {};
      (allocByDetail[sell.id] || [])
        .filter((a) => a.kind === 'REDUCE')
        .forEach((a) => (rowByLot[a.specificLotId] = a));

      const lotIds = new Set([...Object.keys(editOrig), ...Object.keys(editAllocs)]);
      for (const lotId of lotIds) {
        const oldQ = editOrig[lotId] || 0;
        const newQ = editAllocs[lotId] || 0;
        if (Math.abs(oldQ - newQ) < 1e-9) continue;
        const lot = specById[lotId];
        const newBal = (lot.balanceQty ?? lot.quantity) + oldQ - newQ;
        await client.models.HoldingSpecificLot.update({
          id: lotId,
          balanceQty: newBal,
          soldOut: newBal <= 1e-9,
        });
        const row = rowByLot[lotId];
        if (row && newQ > 0)
          await client.models.TradeLotAllocation.update({ id: row.id, quantity: newQ });
        else if (row && newQ <= 0)
          await client.models.TradeLotAllocation.delete({ id: row.id });
        else if (!row && newQ > 0)
          await client.models.TradeLotAllocation.create({
            tradeDetailId: sell.id,
            specificLotId: lotId,
            quantity: newQ,
            kind: 'REDUCE',
          });
      }

      const newPnl = editPnl();
      await client.models.TradeDetail.update({ id: sell.id, realizedPnl: newPnl });
      if (viewBook) {
        const delta = newPnl - (sell.realizedPnl || 0);
        await client.models.TradeBook.update({
          id: viewBook.id,
          realizedPnl: (viewBook.realizedPnl || 0) + delta,
        });
      }
      message.success('Lot allocation updated.');
      setEditSell(null);
      load();
    } catch (e) {
      message.error(`Update failed: ${e.message}`);
    } finally {
      setEditSaving(false);
    }
  }

  const specByCompany = useMemo(() => {
    const m = {};
    specLots.forEach((l) => {
      const bal = l.balanceQty ?? l.quantity;
      if (bal <= 0) return;
      (m[l.companyId] = m[l.companyId] || []).push(l);
    });
    Object.values(m).forEach((arr) =>
      arr.sort((a, b) => (a.buyDate < b.buyDate ? -1 : 1))
    );
    return m;
  }, [specLots]);

  // OPEN recovery swings grouped by company, oldest first (buy-backs close FIFO)
  const openSwingsByCompany = useMemo(() => {
    const m = {};
    recSwings
      .filter((s) => s.status === 'OPEN')
      .forEach((s) => (m[s.companyId] = m[s.companyId] || []).push(s));
    Object.values(m).forEach((arr) =>
      arr.sort((a, b) => String(a.sellDate || '').localeCompare(String(b.sellDate || '')))
    );
    return m;
  }, [recSwings]);

  // tag maps for the history View: which TradeDetail opened / closed swings
  const swingOpenByDetail = useMemo(() => {
    const s = new Set();
    recSwings.forEach((x) => x.openTradeDetailId && s.add(x.openTradeDetailId));
    return s;
  }, [recSwings]);
  // swings grouped by the sell TradeDetail that opened them (for the drill-down)
  const swingsByDetail = useMemo(() => {
    const m = {};
    recSwings.forEach((x) => {
      if (x.openTradeDetailId) (m[x.openTradeDetailId] = m[x.openTradeDetailId] || []).push(x);
    });
    return m;
  }, [recSwings]);
  const buyBackProfitByDetail = useMemo(() => {
    const m = {};
    recSwings.forEach((x) => {
      if (x.closeTradeDetailId)
        m[x.closeTradeDetailId] = (m[x.closeTradeDetailId] || 0) + (x.profit || 0);
    });
    return m;
  }, [recSwings]);

  function resolve(mv) {
    const c = isinToCompany[(mv.isin || '').toLowerCase()];
    return c ? { ...mv, companyId: c.id, companyName: c.name } : { ...mv, companyId: null };
  }

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        let date = null;
        const fills = data
          .map((raw) => {
            const d = pick(raw, 'trade_date');
            if (d) date = d;
            return {
              symbol: pick(raw, 'symbol'),
              isin: pick(raw, 'isin'),
              exchange: pick(raw, 'exchange'),
              side: pick(raw, 'trade_type').toLowerCase(),
              quantity: num(pick(raw, 'quantity')),
              price: num(pick(raw, 'price')),
              time: pick(raw, 'order_execution_time'),
            };
          })
          .filter((f) => f.symbol && (f.side === 'buy' || f.side === 'sell'));

        const { intraday, deliveryBuys, deliverySells } = classifyTradebook(fills);
        const rb = deliveryBuys.map(resolve);
        const rs = deliverySells.map(resolve);
        const ri = intraday.map(resolve);

        const un = [...rb, ...rs, ...ri]
          .filter((m) => !m.companyId)
          .map((m) => `${m.symbol} (${m.exchange})`);

        const okBuys = rb.filter((m) => m.companyId);
        setTradeDate(date);
        setBuys(okBuys);
        setSells(rs.filter((m) => m.companyId));
        setIntra(ri.filter((m) => m.companyId));
        setUnmatched([...new Set(un)]);

        // default: a buy of a scrip with open recovery swings is a buy-back
        const flags = {};
        okBuys.forEach((b, i) => {
          if ((openSwingsByCompany[b.companyId] || []).length > 0) flags[i] = true;
        });
        setBuyBackFlags(flags);

        // start with nothing chosen — the user selects lots via the buttons
        setAllocs({});
        setProcError(null);
        // open the import wizard whenever a file parsed (even if all skipped)
        setImportOpen(true);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
  }

  function autoFill(i, sell) {
    setAllocs((p) => ({ ...p, [i]: fifoFill(sell) }));
  }

  function fifoFill(sell) {
    const lots = specByCompany[sell.companyId] || [];
    let left = sell.qty;
    const a = {};
    for (const l of lots) {
      if (left <= 0) break;
      const bal = l.balanceQty ?? l.quantity;
      const take = Math.min(bal, left);
      if (take > 0) a[l.id] = take;
      left -= take;
    }
    return a;
  }

  // click "Choose" on a lot → allocate as much of it as the sale still needs
  function chooseLot(i, sell, lot) {
    const remaining = sell.qty - allocTotal(i);
    if (remaining <= 0) return;
    const bal = lot.balanceQty ?? lot.quantity;
    const take = Math.min(bal, remaining);
    setAllocs((p) => ({ ...p, [i]: { ...(p[i] || {}), [lot.id]: take } }));
  }
  function unchooseLot(i, lotId) {
    setAllocs((p) => {
      const cur = { ...(p[i] || {}) };
      delete cur[lotId];
      return { ...p, [i]: cur };
    });
  }

  const sellAlloc = (i) => allocs[i] || {};
  const allocTotal = (i) =>
    Object.values(sellAlloc(i)).reduce((s, v) => s + (Number(v) || 0), 0);
  // realized P&L of a sell = only the lots sold at/above cost. A lot sold BELOW
  // its buy price becomes a recovery swing (loss deferred), so it's excluded.
  // a chosen lot becomes a recovery swing only if recovery is enabled AND the
  // sell price is below the lot's buy price
  const isRecoveryLot = (sell, lot) =>
    RECOVERY_ENABLED && !!lot && sell.price < lot.avgPrice;

  const sellPnl = (i) => {
    const sell = sells[i];
    const lotById = Object.fromEntries((specByCompany[sell.companyId] || []).map((l) => [l.id, l]));
    return Object.entries(sellAlloc(i)).reduce((s, [lotId, q]) => {
      const lot = lotById[lotId];
      if (!lot || isRecoveryLot(sell, lot)) return s; // recovery lot → not booked
      return s + (sell.price - lot.avgPrice) * (Number(q) || 0);
    }, 0);
  };

  // shares in a sell that will be routed to recovery swings (sold below cost)
  const sellRecoveryQty = (i) => {
    const sell = sells[i];
    const lotById = Object.fromEntries((specByCompany[sell.companyId] || []).map((l) => [l.id, l]));
    return Object.entries(sellAlloc(i)).reduce((s, [lotId, q]) => {
      const lot = lotById[lotId];
      return s + (isRecoveryLot(sell, lot) ? Number(q) || 0 : 0);
    }, 0);
  };

  const totalPnl =
    intra.reduce((s, m) => s + m.pnl, 0) +
    sells.reduce((s, _m, i) => s + sellPnl(i), 0);

  const allSellsAllocated = sells.every(
    (s, i) => Math.abs(allocTotal(i) - s.qty) < 1e-6
  );

  const hasFile = buys.length + sells.length + intra.length > 0;

  const selectedBroker = useMemo(
    () => brokers.find((b) => b.id === brokerId) || null,
    [brokers, brokerId]
  );

  // estimated taxes & charges for the loaded tradebook under the chosen broker
  const charges = useMemo(
    () => (selectedBroker && hasFile ? computeCharges(selectedBroker, buys, sells, intra) : null),
    [selectedBroker, hasFile, buys, sells, intra]
  );

  const netPnl = charges ? totalPnl - charges.total : totalPnl;

  // ---- build a company-by-company plan for the saver -----------------------
  function buildImportPlan() {
    const byCompany = {};
    const ensure = (cid, name) =>
      (byCompany[cid] = byCompany[cid] || {
        companyId: cid,
        companyName: name,
        buys: [],
        sells: [],
        intra: [],
      });
    buys.forEach((b, i) => {
      ensure(b.companyId, b.companyName).buys.push({
        symbol: b.symbol,
        exchange: b.exchange,
        qty: b.qty,
        price: b.price,
        buyBack: !!buyBackFlags[i],
      });
    });
    sells.forEach((s, i) => {
      ensure(s.companyId, s.companyName).sells.push({
        symbol: s.symbol,
        exchange: s.exchange,
        qty: s.qty,
        price: s.price,
        alloc: sellAlloc(i),
      });
    });
    intra.forEach((m) => {
      ensure(m.companyId, m.companyName).intra.push({
        symbol: m.symbol,
        exchange: m.exchange,
        qty: m.qty,
        avgBuy: m.avgBuy,
        avgSell: m.avgSell,
        pnl: m.pnl,
      });
    });
    // companies with sells run last; alphabetical within each group
    const companiesList = Object.values(byCompany).sort((a, b) => {
      const as = a.sells.length ? 1 : 0;
      const bs = b.sells.length ? 1 : 0;
      if (as !== bs) return as - bs;
      return a.companyName.localeCompare(b.companyName);
    });
    const sellCash = sells.reduce((s, x) => s + x.qty * x.price, 0);
    const buyCash = buys.reduce((s, x) => s + x.qty * x.price, 0);
    const intradayCash = intra.reduce((s, m) => s + m.pnl, 0);
    const fundNet = sellCash - buyCash + intradayCash - (charges ? charges.total : 0);
    return {
      tradeDate,
      brokerId: brokerId || null,
      charges: charges || null,
      totalPnl,
      fundNet,
      companies: companiesList,
    };
  }

  function startSave() {
    if (!allSellsAllocated) {
      return message.error('Allocate every delivery sell to lots first.');
    }
    setSaverPlan(buildImportPlan());
    setSaverRun(null);
    setImportOpen(false);
    setSaverOpen(true);
  }

  function resumeSave(runRec) {
    setSaverPlan(null);
    setSaverRun(runRec);
    setSaverOpen(true);
  }

  function onSaverDone() {
    setSaverOpen(false);
    setSaverPlan(null);
    setSaverRun(null);
    setBuys([]);
    setSells([]);
    setIntra([]);
    setUnmatched([]);
    setAllocs({});
    setBuyBackFlags({});
    setTradeDate(null);
    load();
  }

  // ---- apply ---------------------------------------------------------------

  async function process() {
    if (!allSellsAllocated) {
      return message.error('Allocate every delivery sell to lots first (must equal the sold qty).');
    }
    setProcessing(true);
    setProgress(0);
    setProcError(null);
    const steps = buys.length + sells.length + intra.length + 1;
    let done = 0;
    const tick = () => setProgress(Math.round((++done / steps) * 100));
    // track where we are so a failure message is specific
    let stage = 'creating tradebook';

    try {
      const { data: book, errors: bookErrors } = await client.models.TradeBook.create({
        tradeDate,
        realizedPnl: totalPnl,
        note: 'Tradebook import',
        buyCount: buys.length,
        sellCount: sells.length,
        intradayCount: intra.length,
        brokerId: brokerId || null,
        charges: charges ? charges.total : null,
        chargesBreakdown: charges ? JSON.stringify(charges) : null,
      });
      if (bookErrors || !book) {
        throw new Error(
          `Couldn't create the tradebook: ${
            bookErrors ? bookErrors.map((e) => e.message).join(', ') : 'no data returned'
          }`
        );
      }
      const tradeBookId = book.id;
      tick();

      // working copy of FIFO balances for reduction across sells
      const fifoWork = {};
      fifoLots.forEach((l) => (fifoWork[l.id] = { ...l }));
      const fifoByCompany = {};
      Object.values(fifoWork).forEach((l) => {
        const bal = l.balanceQty ?? l.quantity;
        if (bal <= 0) return;
        (fifoByCompany[l.companyId] = fifoByCompany[l.companyId] || []).push(l);
      });
      Object.values(fifoByCompany).forEach((arr) =>
        arr.sort((a, b) => (a.buyDate < b.buyDate ? -1 : 1))
      );

      // working copy of specific-lot balances (for buy-back restores)
      const specWork = {};
      allSpec.forEach((l) => (specWork[l.id] = { ...l }));

      // Delivery BUYS. FIFO always gets a normal new lot. On the specific-lot
      // side, a buy flagged as a buy-back first CLOSES open recovery swings
      // (restoring shares to their lot at the ORIGINAL price and booking the
      // recovery profit); any leftover quantity becomes a normal new lot.
      let recoveredTotal = 0;
      stage = 'processing delivery buys';
      for (let bi = 0; bi < buys.length; bi++) {
        const b = buys[bi];
        stage = `processing buy: ${b.companyName} (${b.exchange})`;
        // FIFO: a straight new lot (FIFO treats swings as ordinary buys/sells)
        await client.models.HoldingFIFO.create({
          companyId: b.companyId,
          buyDate: tradeDate,
          quantity: b.qty,
          balanceQty: b.qty,
          avgPrice: b.price,
          soldOut: false,
        });
        if (!portfolio.some((p) => p.companyId === b.companyId)) {
          await client.models.PortfolioItem.create({ companyId: b.companyId });
          portfolio.push({ companyId: b.companyId });
        }

        const swings = openSwingsByCompany[b.companyId] || [];
        const isBuyBack = !!buyBackFlags[bi] && swings.length > 0;
        let remaining = b.qty;
        let buyRecovered = 0;

        // the buy's TradeDetail — created first so swings can reference it
        const det = (
          await client.models.TradeDetail.create({
            tradeBookId,
            companyId: b.companyId,
            symbol: b.symbol,
            exchange: b.exchange,
            tradeType: 'DELIVERY',
            side: 'BUY',
            quantity: b.qty,
            price: b.price,
          })
        ).data;

        if (isBuyBack) {
          for (const sw of swings) {
            if (remaining <= 1e-9) break;
            const m = Math.min(remaining, sw.qty);
            const profit = (sw.sellPrice - b.price) * m;
            buyRecovered += profit;
            remaining -= m;
            // restore the shares to the lot at its original price
            const lot = specWork[sw.specificLotId];
            if (lot) {
              const newBal = (lot.balanceQty ?? lot.quantity) + m;
              lot.balanceQty = newBal;
              await client.models.HoldingSpecificLot.update({
                id: lot.id,
                balanceQty: newBal,
                soldOut: false,
                recovering: true,
              });
            }
            if (m >= sw.qty - 1e-9) {
              await client.models.RecoverySwing.update({
                id: sw.id,
                status: 'CLOSED',
                closeType: 'BUYBACK',
                buyBackPrice: b.price,
                buyBackDate: tradeDate,
                profit,
                closeTradeDetailId: det?.id,
              });
            } else {
              // partial: shrink the open swing, log the closed portion
              await client.models.RecoverySwing.update({ id: sw.id, qty: sw.qty - m });
              await client.models.RecoverySwing.create({
                companyId: b.companyId,
                specificLotId: sw.specificLotId,
                qty: m,
                sellPrice: sw.sellPrice,
                sellDate: sw.sellDate,
                status: 'CLOSED',
                closeType: 'BUYBACK',
                buyBackPrice: b.price,
                buyBackDate: tradeDate,
                profit,
                openTradeDetailId: sw.openTradeDetailId,
                closeTradeDetailId: det?.id,
              });
            }
          }
        }
        recoveredTotal += buyRecovered;

        // record the recovery profit on the buy detail
        if (isBuyBack && det) {
          await client.models.TradeDetail.update({ id: det.id, realizedPnl: buyRecovered });
        }

        // leftover (non-buy-back) quantity opens a fresh specific lot
        if (remaining > 1e-9) {
          const { data: sLot } = await client.models.HoldingSpecificLot.create({
            companyId: b.companyId,
            buyDate: tradeDate,
            quantity: remaining,
            balanceQty: remaining,
            avgPrice: b.price,
            soldOut: false,
          });
          if (sLot && det) {
            await client.models.TradeLotAllocation.create({
              tradeDetailId: det.id,
              specificLotId: sLot.id,
              quantity: remaining,
              kind: 'OPEN',
            });
          }
        }
        tick();
      }

      // Delivery SELLS -> reduce FIFO (oldest) + specific (chosen) + REDUCE allocations
      stage = 'processing delivery sells';
      for (let i = 0; i < sells.length; i++) {
        const sell = sells[i];
        stage = `processing sell: ${sell.companyName} (${sell.exchange})`;
        // FIFO: reduce oldest
        let left = sell.qty;
        for (const lot of fifoByCompany[sell.companyId] || []) {
          if (left <= 0) break;
          const bal = lot.balanceQty ?? lot.quantity;
          if (bal <= 0) continue;
          const take = Math.min(bal, left);
          const newBal = bal - take;
          await client.models.HoldingFIFO.update({
            id: lot.id,
            balanceQty: newBal,
            soldOut: newBal <= 1e-9,
          });
          lot.balanceQty = newBal;
          left -= take;
        }

        const { data: det } = await client.models.TradeDetail.create({
          tradeBookId,
          companyId: sell.companyId,
          symbol: sell.symbol,
          exchange: sell.exchange,
          tradeType: 'DELIVERY',
          side: 'SELL',
          quantity: sell.qty,
          price: sell.price,
          realizedPnl: sellPnl(i),
        });

        // Specific: reduce chosen lots. A lot sold BELOW its buy price becomes a
        // recovery swing — the lot stays sticky (not closed) and no loss is
        // booked; a lot sold at/above cost is a normal reduction.
        const lotById = Object.fromEntries(
          (specByCompany[sell.companyId] || []).map((l) => [l.id, l])
        );
        for (const [lotId, q] of Object.entries(sellAlloc(i))) {
          const qty = Number(q) || 0;
          if (qty <= 0) continue;
          const lot = lotById[lotId];
          if (!lot) {
            throw new Error(
              `Allocated lot no longer available for ${sell.companyName} (${sell.exchange}). ` +
                `Re-open the file and re-choose the lots, then process again.`
            );
          }
          const bal = lot.balanceQty ?? lot.quantity;
          const newBal = bal - qty;
          const isRecovery = isRecoveryLot(sell, lot); // gated on RECOVERY_ENABLED
          await client.models.HoldingSpecificLot.update({
            id: lotId,
            balanceQty: newBal,
            // sticky when recovering: keep the lot even at zero balance
            soldOut: isRecovery ? false : newBal <= 1e-9,
            ...(RECOVERY_ENABLED
              ? { recovering: isRecovery ? true : lot.recovering ?? false }
              : {}),
          });
          if (isRecovery && client.models.RecoverySwing) {
            await client.models.RecoverySwing.create({
              companyId: sell.companyId,
              specificLotId: lotId,
              qty,
              sellPrice: sell.price,
              sellDate: tradeDate,
              status: 'OPEN',
              openTradeDetailId: det?.id,
            });
          } else if (det) {
            await client.models.TradeLotAllocation.create({
              tradeDetailId: det.id,
              specificLotId: lotId,
              quantity: qty,
              kind: 'REDUCE',
            });
          }
        }
        tick();
      }

      // Intraday -> P&L only
      const intraByCompany = {};
      for (const m of intra) {
        await client.models.TradeDetail.create({
          tradeBookId,
          companyId: m.companyId,
          symbol: m.symbol,
          exchange: m.exchange,
          tradeType: 'INTRADAY',
          quantity: m.qty,
          avgBuy: m.avgBuy,
          avgSell: m.avgSell,
          realizedPnl: m.pnl,
        });
        intraByCompany[m.companyId] = (intraByCompany[m.companyId] || 0) + m.pnl;
        tick();
      }

      // fold any buy-back recovery profit into the book's realized P&L
      if (Math.abs(recoveredTotal) > 1e-6) {
        await client.models.TradeBook.update({
          id: tradeBookId,
          realizedPnl: totalPnl + recoveredTotal,
        });
      }

      // record an outstanding recovery entry for each company that had a net
      // intraday LOSS on this day (only if the model is deployed)
      if (client.models.RecoveryEntry) {
        for (const [cid, pnl] of Object.entries(intraByCompany)) {
          if (pnl < 0) {
            await client.models.RecoveryEntry.create({
              companyId: cid,
              amount: -pnl,
              incurredOn: tradeDate,
              note: 'Intraday loss',
            });
          }
        }
      }

      // fund impact of the day's trading: sells (+) − buys (−) + intraday P&L,
      // then taxes & charges deducted
      const sellCash = sells.reduce((s, x) => s + x.qty * x.price, 0);
      const buyCash = buys.reduce((s, x) => s + x.qty * x.price, 0);
      const intradayCash = intra.reduce((s, m) => s + m.pnl, 0);
      const chargesCash = charges ? charges.total : 0;
      const netTradingCash = sellCash - buyCash + intradayCash - chargesCash;
      if (client.models.FundEntry && Math.abs(netTradingCash) > 1e-6) {
        await client.models.FundEntry.create({
          date: tradeDate,
          type: 'TRADING',
          amount: netTradingCash,
          note: 'Trading (day net)',
        });
      }

      message.success(
        charges
          ? `Processed ${tradeDate}. P&L ${money(totalPnl)} − charges ${money(charges.total)} = net ${money(netPnl)}.`
          : `Processed trades for ${tradeDate}. Booked P&L ${money(totalPnl)}.`
      );
      // reset
      setBuys([]);
      setSells([]);
      setIntra([]);
      setUnmatched([]);
      setAllocs({});
      setBuyBackFlags({});
      setTradeDate(null);
      setImportOpen(false);
      load();
    } catch (e) {
      const msg = `Processing failed while ${stage}. ${e.message || e}`;
      setProcError(msg);
      message.error({ content: msg, duration: 8 });
    } finally {
      setProcessing(false);
    }
  }

  // ---- delete import (rollback) --------------------------------------------
  // Work out exactly what reversing an imported TradeBook would touch, so the
  // user can review before we run it. Specific-lot side is reversed exactly
  // from the recorded allocations/swings. FIFO is reversed by net: buy-created
  // lots are deleted and sold quantity is refilled oldest-first (best-effort,
  // since FIFO reductions aren't individually recorded).
  async function openRollback(book) {
    setRollback({ book, loading: true });
    try {
      const dets = details.filter((d) => d.tradeBookId === book.id);
      const detIds = new Set(dets.map((d) => d.id));
      const allocs = allocations.filter((a) => detIds.has(a.tradeDetailId));
      const openedSwings = recSwings.filter(
        (s) => s.openTradeDetailId && detIds.has(s.openTradeDetailId)
      );
      const closedByThis = recSwings.filter(
        (s) => s.closeTradeDetailId && detIds.has(s.closeTradeDetailId)
      );
      const [fund, recEnt, allFifo] = await Promise.all([
        client.models.FundEntry
          ? listAll(client.models.FundEntry, {
              and: [{ date: { eq: book.tradeDate } }, { type: { eq: 'TRADING' } }],
            })
          : [],
        client.models.RecoveryEntry
          ? listAll(client.models.RecoveryEntry, { incurredOn: { eq: book.tradeDate } })
          : [],
        client.models.HoldingFIFO ? listAll(client.models.HoldingFIFO) : [],
      ]);

      // build the reversal plan
      const lotDeltas = {}; // lotId -> net qty to add back
      const addDelta = (id, q) => (lotDeltas[id] = (lotDeltas[id] || 0) + q);
      const lotsToDelete = [];
      const allocsToDelete = allocs.map((a) => a.id);
      allocs.forEach((a) => {
        if (a.kind === 'REDUCE') addDelta(a.specificLotId, a.quantity); // restore sold
        else if (a.kind === 'OPEN') lotsToDelete.push(a.specificLotId); // buy-created lot
      });
      openedSwings.forEach((s) => addDelta(s.specificLotId, s.qty)); // recovery sell → restore
      const swingsToReopen = [];
      const swingsToDelete = openedSwings.map((s) => s.id);
      closedByThis.forEach((s) => {
        addDelta(s.specificLotId, -s.qty); // undo the buy-back restore
        // opened by a PRIOR import → reopen it; created here (partial) → delete
        if (s.openTradeDetailId && detIds.has(s.openTradeDetailId)) swingsToDelete.push(s.id);
        else swingsToReopen.push(s.id);
      });

      // --- FIFO reversal (keeps the Portfolio qty column correct) -----------
      const fifoByCo = {};
      allFifo.forEach((l) => (fifoByCo[l.companyId] = fifoByCo[l.companyId] || []).push(l));
      Object.values(fifoByCo).forEach((a) =>
        a.sort(
          (x, y) =>
            String(x.buyDate || '').localeCompare(String(y.buyDate || '')) ||
            String(x.createdAt || '').localeCompare(String(y.createdAt || ''))
        )
      );
      // delete the FIFO lot each delivery buy created (match date+qty+price)
      const usedFifo = new Set();
      const fifoDeleteIds = [];
      dets
        .filter((d) => d.tradeType === 'DELIVERY' && d.side === 'BUY')
        .forEach((d) => {
          const cand = (fifoByCo[d.companyId] || []).find(
            (l) =>
              !usedFifo.has(l.id) &&
              l.buyDate === book.tradeDate &&
              Math.abs((l.avgPrice || 0) - (d.price || 0)) < 1e-4 &&
              Math.abs((l.quantity || 0) - (d.quantity || 0)) < 1e-6
          );
          if (cand) {
            usedFifo.add(cand.id);
            fifoDeleteIds.push(cand.id);
          }
        });
      // refill the quantity each delivery sell removed (oldest lots first)
      const delF = new Set(fifoDeleteIds);
      const sellByCo = {};
      dets
        .filter((d) => d.tradeType === 'DELIVERY' && d.side === 'SELL')
        .forEach((d) => (sellByCo[d.companyId] = (sellByCo[d.companyId] || 0) + (d.quantity || 0)));
      const fifoUpdates = [];
      let fifoRestored = 0;
      for (const [cid, qty] of Object.entries(sellByCo)) {
        let rem = qty;
        for (const l of fifoByCo[cid] || []) {
          if (rem <= 1e-9) break;
          if (delF.has(l.id)) continue;
          const bal = l.balanceQty ?? l.quantity;
          const room = (l.quantity || 0) - bal;
          if (room <= 1e-9) continue;
          const add = Math.min(room, rem);
          fifoUpdates.push({ id: l.id, balanceQty: bal + add });
          rem -= add;
          fifoRestored += add;
        }
      }

      const nameOf = (cid) => companyById[cid]?.name ?? cid;
      const detailRows = dets.map((d) => ({
        key: d.id,
        company: nameOf(d.companyId),
        kind:
          d.tradeType === 'INTRADAY'
            ? 'Intraday'
            : `${d.side === 'BUY' ? 'Buy' : 'Sell'} · delivery`,
        qty: d.quantity,
        price: d.price ?? d.avgSell,
        pnl: d.realizedPnl,
      }));
      const delDel = new Set(lotsToDelete);
      const lotRestoreRows = Object.entries(lotDeltas)
        .filter(([id, delta]) => Math.abs(delta) > 1e-9 && !delDel.has(id))
        .map(([id, delta]) => {
          const lot = specById[id];
          return {
            key: id,
            company: lot ? nameOf(lot.companyId) : id,
            buyDate: lot?.buyDate ?? '—',
            avgPrice: lot?.avgPrice,
            delta,
          };
        });
      const lotDeleteRows = lotsToDelete.map((id) => {
        const lot = specById[id];
        return {
          key: id,
          company: lot ? nameOf(lot.companyId) : id,
          buyDate: lot?.buyDate ?? '—',
          avgPrice: lot?.avgPrice,
          qty: lot?.quantity,
        };
      });

      const impact = {
        buys: dets.filter((d) => d.tradeType === 'DELIVERY' && d.side === 'BUY').length,
        sells: dets.filter((d) => d.tradeType === 'DELIVERY' && d.side === 'SELL').length,
        intraday: dets.filter((d) => d.tradeType === 'INTRADAY').length,
        details: dets.length,
        allocs: allocsToDelete.length,
        lotsRestored: lotRestoreRows.filter((r) => r.delta > 0).length,
        lotsDeleted: lotsToDelete.length,
        swingsDeleted: swingsToDelete.length,
        swingsReopened: swingsToReopen.length,
        fund: fund.length,
        fundAmount: fund.reduce((s, f) => s + (f.amount || 0), 0),
        recEntries: recEnt.length,
        fifoDeleted: fifoDeleteIds.length,
        fifoRestored,
        detailRows,
        lotRestoreRows,
        lotDeleteRows,
      };
      const plan = {
        bookId: book.id,
        lotDeltas,
        lotsToDelete,
        allocsToDelete,
        swingsToDelete,
        swingsToReopen,
        fifoDeleteIds,
        fifoUpdates,
        detailIds: dets.map((d) => d.id),
        fundIds: fund.map((f) => f.id),
        recIds: recEnt.map((r) => r.id),
      };
      setRollback({ book, loading: false, impact, plan });
    } catch (e) {
      message.error(`Couldn't analyse: ${e.message}`);
      setRollback(null);
    }
  }

  async function proceedRollback() {
    const rb = rollback;
    if (!rb?.plan) return;
    setRollback((p) => ({ ...p, proceeding: true }));
    const { plan } = rb;
    try {
      // 1) restore / adjust specific-lot balances (skip lots we'll delete)
      const toDelete = new Set(plan.lotsToDelete);
      for (const [lotId, delta] of Object.entries(plan.lotDeltas)) {
        if (toDelete.has(lotId) || Math.abs(delta) < 1e-9) continue;
        const lot = specById[lotId];
        if (!lot) continue;
        const newBal = (lot.balanceQty ?? lot.quantity) + delta;
        await client.models.HoldingSpecificLot.update({
          id: lotId,
          balanceQty: newBal,
          soldOut: newBal <= 1e-9 && !(lot.recovering ?? false),
        });
      }
      // 2) delete buy-created lots
      for (const id of plan.lotsToDelete) await client.models.HoldingSpecificLot.delete({ id });
      // 2b) FIFO: delete buy-created lots, refill sold quantity (keeps Portfolio qty right)
      for (const id of plan.fifoDeleteIds || []) await client.models.HoldingFIFO.delete({ id });
      for (const u of plan.fifoUpdates || [])
        await client.models.HoldingFIFO.update({ id: u.id, balanceQty: u.balanceQty, soldOut: false });
      // 3) reopen swings this import's buy-backs closed
      for (const id of plan.swingsToReopen)
        await client.models.RecoverySwing.update({
          id,
          status: 'OPEN',
          closeType: null,
          buyBackPrice: null,
          buyBackDate: null,
          profit: null,
          closeTradeDetailId: null,
        });
      // 4) delete swings opened by this import (and partial closed records)
      for (const id of plan.swingsToDelete) await client.models.RecoverySwing.delete({ id });
      // 5) delete lot allocations, then trade details, then the book
      for (const id of plan.allocsToDelete)
        await client.models.TradeLotAllocation.delete({ id });
      for (const id of plan.detailIds) await client.models.TradeDetail.delete({ id });
      for (const id of plan.fundIds) await client.models.FundEntry.delete({ id });
      for (const id of plan.recIds) await client.models.RecoveryEntry.delete({ id });
      await client.models.TradeBook.delete({ id: plan.bookId });

      message.success('Import reversed. Please re-check FIFO quantities with Reconcile.');
      setRollback(null);
      load();
    } catch (e) {
      message.error(`Reversal failed (partway): ${e.message}`);
      setRollback((p) => ({ ...p, proceeding: false }));
      load();
    }
  }

  // ---- render --------------------------------------------------------------

  const monthLabel = (mo) =>
    new Date(`${mo}-01T00:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });

  // columns for the history table — a row is either a day (a TradeBook) or a
  // monthly summary (has `_month` + `entries`). Reused for the month expansion.
  const historyColumns = [
    {
      title: 'Date',
      key: 'date',
      width: 170,
      render: (_, r) =>
        r._month ? (
          <strong>
            {monthLabel(r._month)} · {r.entries.length} day(s)
          </strong>
        ) : (
          r.tradeDate
        ),
    },
    { title: 'Buys', dataIndex: 'buyCount', align: 'right', width: 70 },
    { title: 'Sells', dataIndex: 'sellCount', align: 'right', width: 70 },
    { title: 'Intraday', dataIndex: 'intradayCount', align: 'right', width: 90 },
    { title: 'Realized P&L', dataIndex: 'realizedPnl', align: 'right', render: pnlSpan },
    {
      title: 'Charges',
      dataIndex: 'charges',
      align: 'right',
      width: 110,
      render: (v) => (v == null ? '—' : money(v)),
    },
    {
      title: 'Net P&L',
      key: 'netPnl',
      align: 'right',
      width: 120,
      render: (_, r) => pnlSpan((r.realizedPnl || 0) - (r.charges || 0)),
    },
    {
      title: 'Broker',
      dataIndex: 'brokerId',
      width: 110,
      render: (id, r) => (r._month ? '—' : brokerById[id]?.name ?? '—'),
    },
    { title: 'Note', dataIndex: 'note', render: (v, r) => (r._month ? '—' : v || '—') },
    {
      title: '',
      key: 'view',
      width: 170,
      render: (_, r) =>
        r._month ? null : (
          <Space size="small">
            <Button size="small" type="link" onClick={() => setViewBook(r)}>
              View
            </Button>
            <Button size="small" type="link" danger onClick={() => openRollback(r)}>
              Delete import
            </Button>
          </Space>
        ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Daily Trades
        </Typography.Title>
        <Typography.Text type="secondary">
          Upload your broker tradebook. Delivery trades update holdings; intraday
          trades book P&L only.
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Upload accept=".csv,.CSV" showUploadList={false} beforeUpload={handleFile}>
          <Button type="primary">Import trade book</Button>
        </Upload>
        {hasFile && (
          <Button onClick={() => setImportOpen(true)}>Resume import</Button>
        )}
        <Typography.Text type="secondary">
          Upload a broker tradebook CSV to open the import wizard.
        </Typography.Text>
      </div>

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        tradeDate={tradeDate}
        buys={buys}
        sells={sells}
        intra={intra}
        unmatched={unmatched}
        brokers={brokers}
        brokerId={brokerId}
        setBrokerId={setBrokerId}
        buyBackFlags={buyBackFlags}
        setBuyBackFlags={setBuyBackFlags}
        openSwingsByCompany={openSwingsByCompany}
        specByCompany={specByCompany}
        sellAlloc={sellAlloc}
        allocTotal={allocTotal}
        sellPnl={sellPnl}
        sellRecoveryQty={sellRecoveryQty}
        chooseLot={chooseLot}
        unchooseLot={unchooseLot}
        autoFill={autoFill}
        charges={charges}
        totalPnl={totalPnl}
        netPnl={netPnl}
        allSellsAllocated={allSellsAllocated}
        processing={processing}
        progress={progress}
        onProcess={startSave}
        procError={procError}
      />

      <ImportSaver
        open={saverOpen}
        plan={saverPlan}
        resumeRun={saverRun}
        onClose={() => setSaverOpen(false)}
        onDone={onSaverDone}
      />

      {pendingRuns.length > 0 && !saverOpen && (
        <Alert
          type="warning"
          showIcon
          message={`${pendingRuns.length} unfinished import(s)`}
          description={
            <Space direction="vertical">
              {pendingRuns.map((r) => (
                <Space key={r.id}>
                  <span>
                    {r.tradeDate} — {r.status === 'ERROR' ? 'failed part-way' : 'in progress'}
                  </span>
                  <Button size="small" type="primary" onClick={() => resumeSave(r)}>
                    Resume
                  </Button>
                </Space>
              ))}
            </Space>
          }
        />
      )}

      {/* legacy inline import sections — superseded by the wizard above */}
      {false && (
      <>
      {procError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setProcError(null)}
          message="Import failed — partial data may have been written"
          description={
            <div>
              <div style={{ marginBottom: 6 }}>{procError}</div>
              <Typography.Text type="secondary">
                Use “Delete import” on the affected day in the history below to roll it
                back, then fix and re-import.
              </Typography.Text>
            </div>
          }
        />
      )}

      {hasFile && brokers.length === 0 && (
        <Alert
          type="info"
          showIcon
          message="No broker configured"
          description="Add a broker under Master data › Brokers to compute taxes & charges. Trades will process without charges."
        />
      )}

      {hasFile && (
        <Card size="small">
          <Space size="large" wrap>
            <Statistic title="Trade date" value={tradeDate || '—'} />
            <Statistic title="Delivery buys" value={buys.length} />
            <Statistic title="Delivery sells" value={sells.length} />
            <Statistic title="Intraday" value={intra.length} />
            <Statistic
              title="Realized P&L"
              value={money(totalPnl)}
              valueStyle={{ color: totalPnl >= 0 ? '#3f8600' : '#cf1322' }}
            />
            <Statistic
              title="Taxes & charges"
              value={charges ? money(charges.total) : '—'}
              valueStyle={{ color: '#cf1322' }}
            />
            <Statistic
              title="Net P&L"
              value={money(netPnl)}
              valueStyle={{ color: netPnl >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Space>
          {charges && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Descriptions size="small" column={{ xs: 2, sm: 3, md: 4 }} colon>
                <Descriptions.Item label="Brokerage">{money(charges.brokerage)}</Descriptions.Item>
                <Descriptions.Item label="STT">{money(charges.stt)}</Descriptions.Item>
                <Descriptions.Item label="Exch txn">{money(charges.exchTxn)}</Descriptions.Item>
                <Descriptions.Item label="SEBI">{money(charges.sebi)}</Descriptions.Item>
                <Descriptions.Item label="Stamp">{money(charges.stamp)}</Descriptions.Item>
                <Descriptions.Item label="DP">{money(charges.dp)}</Descriptions.Item>
                <Descriptions.Item label="GST">{money(charges.gst)}</Descriptions.Item>
                <Descriptions.Item label="Total">{money(charges.total)}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Card>
      )}

      {unmatched.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${unmatched.length} symbol(s) skipped — no company for ISIN`}
          description={unmatched.join(', ')}
        />
      )}
      {processing && <Progress percent={progress} />}

      {buys.length > 0 && (
        <>
          <Divider orientation="left">Delivery buys → new lots</Divider>
          <Table
            rowKey={(_, i) => i}
            size="small"
            pagination={false}
            dataSource={buys}
            columns={[
              { title: 'Company', dataIndex: 'companyName' },
              { title: 'Exch', dataIndex: 'exchange', width: 80 },
              { title: 'Qty', dataIndex: 'qty', align: 'right' },
              { title: 'Price', dataIndex: 'price', align: 'right', render: money },
              {
                title: 'Buy-back?',
                key: 'buyback',
                width: 220,
                render: (_, b, i) => {
                  const swings = openSwingsByCompany[b.companyId] || [];
                  if (swings.length === 0) return <span style={{ color: '#bbb' }}>—</span>;
                  const pendingQty = swings.reduce((s, x) => s + (x.qty || 0), 0);
                  return (
                    <Tooltip
                      title={`${b.companyName} has ${pendingQty} share(s) open in recovery. Tick to close swings (shares return to the lot at their original price); untick to add as a new lot.`}
                    >
                      <Checkbox
                        checked={!!buyBackFlags[i]}
                        onChange={(e) =>
                          setBuyBackFlags((p) => ({ ...p, [i]: e.target.checked }))
                        }
                      >
                        Buy-back ({pendingQty} open)
                      </Checkbox>
                    </Tooltip>
                  );
                },
              },
            ]}
          />
        </>
      )}

      {sells.length > 0 && (
        <>
          <Divider orientation="left">Delivery sells → choose the lots to sell</Divider>
          {sells.map((sell, i) => {
            const lots = specByCompany[sell.companyId] || [];
            const total = allocTotal(i);
            const ok = Math.abs(total - sell.qty) < 1e-6;
            const remaining = sell.qty - total;
            const held = lots.reduce((s, l) => s + (l.balanceQty ?? l.quantity), 0);
            const pnl = sellPnl(i);
            return (
              <Card
                key={i}
                size="small"
                title={`${sell.companyName} (${sell.exchange})`}
                extra={
                  <Button
                    size="small"
                    onClick={() => setAllocs((p) => ({ ...p, [i]: fifoFill(sell) }))}
                  >
                    Auto-fill (oldest first)
                  </Button>
                }
              >
                {/* summary row */}
                <Space size="large" wrap style={{ marginBottom: 12 }}>
                  <Statistic title="Qty sold" value={sell.qty} />
                  <Statistic title="Sell price" value={money(sell.price)} />
                  <Statistic
                    title="Allocated"
                    value={`${total} / ${sell.qty}`}
                    valueStyle={{ color: ok ? '#3f8600' : '#cf1322' }}
                  />
                  <Statistic
                    title="Booked P&L"
                    value={money(pnl)}
                    valueStyle={{ color: pnl >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                  {sellRecoveryQty(i) > 0 && (
                    <Statistic
                      title="Recovery (swing)"
                      value={sellRecoveryQty(i)}
                      valueStyle={{ color: '#d46b08' }}
                    />
                  )}
                </Space>

                {sellRecoveryQty(i) > 0 && (
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 8 }}
                    message={`${sellRecoveryQty(i)} share(s) sold below cost → kept as a recovery swing (loss not booked; lot stays in holdings).`}
                  />
                )}

                {held < sell.qty && (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 8 }}
                    message={`You only hold ${held} — can't sell ${sell.qty}.`}
                  />
                )}

                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={lots}
                  columns={[
                    {
                      title: 'Buy date',
                      dataIndex: 'buyDate',
                      sorter: (a, b) => String(a.buyDate || '').localeCompare(String(b.buyDate || '')),
                      defaultSortOrder: 'ascend',
                      sortDirections: ['ascend', 'descend'],
                    },
                    {
                      title: 'Buy price',
                      dataIndex: 'avgPrice',
                      align: 'right',
                      render: money,
                      sorter: (a, b) => (a.avgPrice || 0) - (b.avgPrice || 0),
                      sortDirections: ['ascend', 'descend'],
                    },
                    {
                      title: 'Available',
                      align: 'right',
                      render: (_, l) => (l.balanceQty ?? l.quantity)?.toLocaleString('en-IN'),
                    },
                    {
                      title: 'P&L / share',
                      align: 'right',
                      render: (_, l) => {
                        const d = sell.price - l.avgPrice;
                        return (
                          <span style={{ color: d >= 0 ? '#3f8600' : '#cf1322' }}>
                            {money(d)}
                          </span>
                        );
                      },
                    },
                    {
                      title: 'Chosen qty',
                      align: 'right',
                      render: (_, l) => sellAlloc(i)[l.id] || 0,
                    },
                    {
                      title: 'Lot P&L',
                      align: 'right',
                      render: (_, l) => {
                        const q = sellAlloc(i)[l.id] || 0;
                        if (!q) return '—';
                        const p = (sell.price - l.avgPrice) * q;
                        return (
                          <span style={{ color: p >= 0 ? '#3f8600' : '#cf1322' }}>
                            {money(p)}
                          </span>
                        );
                      },
                    },
                    {
                      title: '',
                      align: 'right',
                      width: 100,
                      render: (_, l) => {
                        const chosen = (sellAlloc(i)[l.id] || 0) > 0;
                        return chosen ? (
                          <Button size="small" danger type="text" onClick={() => unchooseLot(i, l.id)}>
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            disabled={remaining <= 0}
                            onClick={() => chooseLot(i, sell, l)}
                          >
                            Choose
                          </Button>
                        );
                      },
                    },
                  ]}
                />
              </Card>
            );
          })}
        </>
      )}

      {intra.length > 0 && (
        <>
          <Divider orientation="left">Intraday → P&L only</Divider>
          <Table
            rowKey={(_, i) => i}
            size="small"
            pagination={false}
            dataSource={intra}
            columns={[
              { title: 'Company', dataIndex: 'companyName' },
              { title: 'Exch', dataIndex: 'exchange', width: 80 },
              { title: 'Qty', dataIndex: 'qty', align: 'right' },
              { title: 'Avg buy', dataIndex: 'avgBuy', align: 'right', render: money },
              { title: 'Avg sell', dataIndex: 'avgSell', align: 'right', render: money },
              {
                title: 'P&L',
                dataIndex: 'pnl',
                align: 'right',
                render: (v) => (
                  <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{money(v)}</span>
                ),
              },
            ]}
          />
        </>
      )}
      </>
      )}

      <Divider orientation="left">Processed daily trades</Divider>
      <Table
        rowKey={(r) => (r._month ? `m-${r._month}` : r.id)}
        size="small"
        loading={loading}
        dataSource={historyRows}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        columns={historyColumns}
        expandable={{
          rowExpandable: (r) => !!r._month,
          expandedRowRender: (r) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={r.entries}
              columns={historyColumns}
              showHeader={false}
            />
          ),
        }}
        locale={{ emptyText: 'No daily trades processed yet.' }}
      />

      {/* Delete import (rollback) — impact preview then proceed */}
      <Modal
        title={rollback ? `Delete import — ${rollback.book.tradeDate}` : ''}
        open={!!rollback}
        onCancel={() => (rollback?.proceeding ? null : setRollback(null))}
        onOk={proceedRollback}
        okText="Proceed — reverse"
        okButtonProps={{ danger: true, loading: rollback?.proceeding, disabled: rollback?.loading }}
        cancelButtonProps={{ disabled: rollback?.proceeding }}
        width={760}
      >
        {rollback?.loading && <Typography.Text>Analysing impact…</Typography.Text>}
        {rollback?.impact && (
          <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
            <Typography.Text>
              This will permanently reverse the import for{' '}
              <strong>{rollback.book.tradeDate}</strong>. Review the impact:
            </Typography.Text>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Trade details deleted">
                {rollback.impact.details} ({rollback.impact.buys} buys, {rollback.impact.sells}{' '}
                sells, {rollback.impact.intraday} intraday)
              </Descriptions.Item>
              <Descriptions.Item label="Lot allocations deleted">
                {rollback.impact.allocs}
              </Descriptions.Item>
              <Descriptions.Item label="Specific lots — shares restored">
                {rollback.impact.lotsRestored} lot(s)
              </Descriptions.Item>
              <Descriptions.Item label="Specific lots — deleted (buy-created)">
                {rollback.impact.lotsDeleted}
              </Descriptions.Item>
              <Descriptions.Item label="Recovery swings deleted">
                {rollback.impact.swingsDeleted}
              </Descriptions.Item>
              <Descriptions.Item label="Recovery swings re-opened">
                {rollback.impact.swingsReopened}
              </Descriptions.Item>
              <Descriptions.Item label="Trading fund entry removed">
                {rollback.impact.fund > 0 ? money(rollback.impact.fundAmount) : 'none'}
              </Descriptions.Item>
              <Descriptions.Item label="Intraday loss entries deleted">
                {rollback.impact.recEntries}
              </Descriptions.Item>
              <Descriptions.Item label="FIFO lots deleted (buy-created)">
                {rollback.impact.fifoDeleted}
              </Descriptions.Item>
              <Descriptions.Item label="FIFO shares put back (sold)">
                {rollback.impact.fifoRestored?.toLocaleString('en-IN')}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Typography.Text strong>Trades removed</Typography.Text>
              <Table
                rowKey="key"
                size="small"
                style={{ marginTop: 6 }}
                pagination={{ pageSize: 6, hideOnSinglePage: true }}
                dataSource={rollback.impact.detailRows}
                locale={{ emptyText: 'None' }}
                columns={[
                  { title: 'Company', dataIndex: 'company' },
                  { title: 'Type', dataIndex: 'kind', width: 120 },
                  { title: 'Qty', dataIndex: 'qty', align: 'right', width: 70 },
                  { title: 'Price', dataIndex: 'price', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                  { title: 'P&L', dataIndex: 'pnl', align: 'right', render: pnlSpan },
                ]}
              />
            </div>

            {rollback.impact.lotRestoreRows.length > 0 && (
              <div>
                <Typography.Text strong>Lots — shares put back</Typography.Text>
                <Table
                  rowKey="key"
                  size="small"
                  style={{ marginTop: 6 }}
                  pagination={{ pageSize: 6, hideOnSinglePage: true }}
                  dataSource={rollback.impact.lotRestoreRows}
                  columns={[
                    { title: 'Company', dataIndex: 'company' },
                    { title: 'Buy date', dataIndex: 'buyDate', width: 110 },
                    { title: 'Buy price', dataIndex: 'avgPrice', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                    {
                      title: 'Change',
                      dataIndex: 'delta',
                      align: 'right',
                      render: (v) => (
                        <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
                          {v >= 0 ? '+' : ''}
                          {v.toLocaleString('en-IN')}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {rollback.impact.lotDeleteRows.length > 0 && (
              <div>
                <Typography.Text strong>Lots — deleted (created by this import's buys)</Typography.Text>
                <Table
                  rowKey="key"
                  size="small"
                  style={{ marginTop: 6 }}
                  pagination={{ pageSize: 6, hideOnSinglePage: true }}
                  dataSource={rollback.impact.lotDeleteRows}
                  columns={[
                    { title: 'Company', dataIndex: 'company' },
                    { title: 'Buy date', dataIndex: 'buyDate', width: 110 },
                    { title: 'Buy price', dataIndex: 'avgPrice', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                    { title: 'Qty', dataIndex: 'qty', align: 'right', width: 80 },
                  ]}
                />
              </div>
            )}

            <Alert
              type="info"
              showIcon
              message="Both holdings are adjusted"
              description="Specific-lot is reversed exactly. FIFO is reversed by net (buy lots deleted, sold quantity refilled oldest-first), so the Portfolio quantity updates too. If your books are complex, it's still worth a quick Reconcile with broker afterwards."
            />
          </Space>
        )}
      </Modal>

      {/* Tradebook viewer: category → script → lots */}
      <Modal
        title={viewBook ? `Tradebook — ${viewBook.tradeDate}` : ''}
        open={!!viewBook}
        onCancel={() => setViewBook(null)}
        footer={null}
        width={860}
      >
        {viewBook && (
          <>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <Typography.Text strong>Taxes &amp; charges</Typography.Text>
              <Select
                size="small"
                style={{ minWidth: 160 }}
                placeholder="Broker"
                value={recalcBrokerId}
                onChange={setRecalcBrokerId}
                options={brokers.map((b) => ({ label: b.name, value: b.id }))}
                notFoundContent="No brokers configured"
              />
              <Button
                size="small"
                type="primary"
                loading={recalcSaving}
                disabled={!recalcBrokerId}
                onClick={recalcCharges}
              >
                {viewBook.charges == null ? 'Calculate charges' : 'Recalculate'}
              </Button>
              {viewBook.charges != null && (
                <Typography.Text type="secondary">
                  Current: {money(viewBook.charges)} · Net P&amp;L{' '}
                  {money((viewBook.realizedPnl || 0) - (viewBook.charges || 0))}
                </Typography.Text>
              )}
            </div>
            {viewBook.charges != null &&
              (() => {
                let cb = viewBook.chargesBreakdown;
                if (typeof cb === 'string') {
                  try {
                    cb = JSON.parse(cb);
                  } catch {
                    cb = null;
                  }
                }
                const rows = [
                  ['Brokerage', cb?.brokerage],
                  ['STT', cb?.stt],
                  ['Exch txn', cb?.exchTxn],
                  ['SEBI', cb?.sebi],
                  ['Stamp', cb?.stamp],
                  ['DP', cb?.dp],
                  ['GST', cb?.gst],
                  ['Total', viewBook.charges],
                ];
                return (
                  <Descriptions size="small" column={{ xs: 2, sm: 3, md: 4 }} colon>
                    {rows.map(([label, v]) => (
                      <Descriptions.Item key={label} label={label}>
                        {v == null ? '—' : money(v)}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                );
              })()}
            <Divider style={{ margin: '12px 0 16px' }} />
          </>
        )}
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={catData}
          columns={[
            { title: 'Category', dataIndex: 'label' },
            { title: 'Trades', dataIndex: 'count', align: 'right', width: 90 },
            { title: 'Qty', dataIndex: 'qty', align: 'right', width: 90 },
            { title: 'Realized P&L', dataIndex: 'pnl', align: 'right', render: pnlSpan },
          ]}
          expandable={{
            rowExpandable: (c) => c.items.length > 0,
            expandedRowRender: (cat) => (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={[...cat.items].sort((a, b) =>
                  (a.symbol || '').localeCompare(b.symbol || '')
                )}
                columns={[
                  {
                    title: 'Company',
                    key: 'company',
                    render: (_, d) => companyById[d.companyId]?.name ?? d.symbol ?? '—',
                  },
                  { title: 'Symbol', dataIndex: 'symbol', width: 110 },
                  { title: 'Exch', dataIndex: 'exchange', width: 70 },
                  { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 70 },
                  {
                    title: 'Price',
                    align: 'right',
                    render: (_, d) => money(d.price ?? d.avgSell),
                  },
                  { title: 'P&L', dataIndex: 'realizedPnl', align: 'right', render: pnlSpan },
                  {
                    title: 'Recovery',
                    key: 'recovery',
                    width: 130,
                    render: (_, d) => {
                      if (swingOpenByDetail.has(d.id)) {
                        return <Tag color="orange">Recovery swing</Tag>;
                      }
                      const bb = buyBackProfitByDetail[d.id];
                      if (bb != null) {
                        return (
                          <Tag color="green">
                            Buy-back {bb >= 0 ? '+' : ''}
                            {money(bb)}
                          </Tag>
                        );
                      }
                      return null;
                    },
                  },
                  {
                    title: '',
                    key: 'edit',
                    width: 90,
                    render: (_, d) =>
                      d.tradeType === 'DELIVERY' && d.side === 'SELL' ? (
                        <Button size="small" type="link" onClick={() => openEditLots(d)}>
                          Edit lots
                        </Button>
                      ) : null,
                  },
                ]}
                expandable={{
                  rowExpandable: (d) =>
                    (allocByDetail[d.id] || []).length > 0 ||
                    (swingsByDetail[d.id] || []).length > 0,
                  expandedRowRender: (d) => {
                    const swings = swingsByDetail[d.id] || [];
                    if (swings.length > 0) {
                      // recovery-swing sell → show the swing(s) it opened
                      return (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={false}
                          dataSource={swings}
                          columns={[
                            {
                              title: 'Lot buy date',
                              render: (_, s) => specById[s.specificLotId]?.buyDate ?? '—',
                            },
                            {
                              title: 'Lot buy price',
                              align: 'right',
                              render: (_, s) => money(specById[s.specificLotId]?.avgPrice),
                            },
                            { title: 'Kind', render: () => <Tag color="orange">RECOVERY</Tag> },
                            { title: 'Qty', dataIndex: 'qty', align: 'right' },
                            {
                              title: 'Sell ₹',
                              dataIndex: 'sellPrice',
                              align: 'right',
                              render: money,
                            },
                            {
                              title: 'Status',
                              render: (_, s) =>
                                s.status === 'OPEN' ? (
                                  <Tag color="gold">Open</Tag>
                                ) : (
                                  <Tag color={s.closeType === 'BUYBACK' ? 'green' : 'default'}>
                                    {s.closeType === 'BUYBACK' ? 'Bought back' : 'Closed'}
                                  </Tag>
                                ),
                            },
                          ]}
                        />
                      );
                    }
                    return (
                      <Table
                        rowKey="id"
                        size="small"
                        pagination={false}
                        dataSource={allocByDetail[d.id] || []}
                        columns={[
                          {
                            title: 'Lot buy date',
                            render: (_, a) => specById[a.specificLotId]?.buyDate ?? '—',
                          },
                          {
                            title: 'Lot buy price',
                            align: 'right',
                            render: (_, a) => money(specById[a.specificLotId]?.avgPrice),
                          },
                          {
                            title: 'Kind',
                            dataIndex: 'kind',
                            render: (v) => <Tag>{v}</Tag>,
                          },
                          { title: 'Qty', dataIndex: 'quantity', align: 'right' },
                          {
                            title: 'P&L',
                            align: 'right',
                            render: (_, a) => {
                              const lot = specById[a.specificLotId];
                              if (a.kind !== 'REDUCE' || !lot) return '—';
                              return pnlSpan((d.price - lot.avgPrice) * a.quantity);
                            },
                          },
                        ]}
                      />
                    );
                  },
                }}
              />
            ),
          }}
        />
      </Modal>

      {/* Edit lots of a delivery sell */}
      <Modal
        title={editSell ? `Edit lots — ${companyById[editSell.companyId]?.name ?? editSell.symbol}` : ''}
        open={!!editSell}
        onCancel={() => (editSaving ? null : setEditSell(null))}
        onOk={saveEditLots}
        okText="Save"
        okButtonProps={{
          loading: editSaving,
          disabled: !editSell || Math.abs(editTotal() - editSell.quantity) > 1e-6,
        }}
        width={720}
        destroyOnClose
      >
        {editSell && (
          <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
            <Space size="large" wrap>
              <Statistic title="Qty sold" value={editSell.quantity} />
              <Statistic title="Sell price" value={money(editSell.price)} />
              <Statistic
                title="Allocated"
                value={`${editTotal()} / ${editSell.quantity}`}
                valueStyle={{
                  color:
                    Math.abs(editTotal() - editSell.quantity) < 1e-6 ? '#3f8600' : '#cf1322',
                }}
              />
              <Statistic
                title="Booked P&L"
                value={money(editPnl())}
                valueStyle={{ color: editPnl() >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Space>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={allSpec
                .filter((l) => l.companyId === editSell.companyId)
                .filter((l) => editAvail(l) > 0)
                .sort((a, b) => {
                  // lots already allocated to THIS sale float to the top
                  const ao = (editOrig[a.id] || 0) > 0 ? 0 : 1;
                  const bo = (editOrig[b.id] || 0) > 0 ? 0 : 1;
                  if (ao !== bo) return ao - bo;
                  return a.buyDate < b.buyDate ? -1 : 1;
                })}
              rowClassName={(l) => ((editOrig[l.id] || 0) > 0 ? 'ant-table-row-selected' : '')}
              columns={[
                { title: 'Buy date', dataIndex: 'buyDate' },
                { title: 'Buy price', dataIndex: 'avgPrice', align: 'right', render: money },
                {
                  title: 'Allocated (this sale)',
                  align: 'right',
                  render: (_, l) =>
                    (editOrig[l.id] || 0) > 0 ? (
                      <Tag color="blue">{editOrig[l.id].toLocaleString('en-IN')}</Tag>
                    ) : (
                      <span style={{ color: '#bbb' }}>—</span>
                    ),
                },
                {
                  title: 'Available',
                  align: 'right',
                  render: (_, l) => editAvail(l)?.toLocaleString('en-IN'),
                },
                {
                  title: 'P&L / share',
                  align: 'right',
                  render: (_, l) => pnlSpan(editSell.price - l.avgPrice),
                },
                {
                  title: 'Chosen qty',
                  align: 'right',
                  render: (_, l) => editAllocs[l.id] || 0,
                },
                {
                  title: '',
                  align: 'right',
                  width: 100,
                  render: (_, l) => {
                    const chosen = (editAllocs[l.id] || 0) > 0;
                    const remaining = editSell.quantity - editTotal();
                    return chosen ? (
                      <Button size="small" danger type="text" onClick={() => unchooseEditLot(l.id)}>
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        disabled={remaining <= 0}
                        onClick={() => chooseEditLot(l)}
                      >
                        Choose
                      </Button>
                    );
                  },
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}
