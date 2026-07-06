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
  message,
} from 'antd';
import { classifyTradebook } from '../tradebook';
import { computeCharges } from '../charges';

const client = generateClient();

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

  // history of processed daily trades
  const [books, setBooks] = useState([]);
  const [details, setDetails] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [allSpec, setAllSpec] = useState([]); // all lots incl. sold-out, for lot lookup
  const [viewBook, setViewBook] = useState(null);
  const [recalcBrokerId, setRecalcBrokerId] = useState(null);
  const [recalcSaving, setRecalcSaving] = useState(false);

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
      const [co, f, s, pf, tb, td, al, allS, br] = await Promise.all([
        listAll(client.models.Company),
        listAll(client.models.HoldingFIFO, active),
        listAll(client.models.HoldingSpecificLot, active),
        listAll(client.models.PortfolioItem),
        listAll(client.models.TradeBook),
        listAll(client.models.TradeDetail),
        listAll(client.models.TradeLotAllocation),
        listAll(client.models.HoldingSpecificLot),
        client.models.Broker ? listAll(client.models.Broker) : [],
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

  // history: TradeBooks newest first, with their details grouped
  const historyRows = useMemo(
    () => [...books].sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1)),
    [books]
  );
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

        setTradeDate(date);
        setBuys(rb.filter((m) => m.companyId));
        setSells(rs.filter((m) => m.companyId));
        setIntra(ri.filter((m) => m.companyId));
        setUnmatched([...new Set(un)]);

        // start with nothing chosen — the user selects lots via the buttons
        setAllocs({});
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
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
  const sellPnl = (i) => {
    const sell = sells[i];
    const lotById = Object.fromEntries((specByCompany[sell.companyId] || []).map((l) => [l.id, l]));
    return Object.entries(sellAlloc(i)).reduce((s, [lotId, q]) => {
      const lot = lotById[lotId];
      return s + (lot ? (sell.price - lot.avgPrice) * (Number(q) || 0) : 0);
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

  // ---- apply ---------------------------------------------------------------

  async function process() {
    if (!allSellsAllocated) {
      return message.error('Allocate every delivery sell to lots first (must equal the sold qty).');
    }
    setProcessing(true);
    setProgress(0);
    const steps = buys.length + sells.length + intra.length + 1;
    let done = 0;
    const tick = () => setProgress(Math.round((++done / steps) * 100));

    try {
      const { data: book } = await client.models.TradeBook.create({
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

      // Delivery BUYS -> new lots + OPEN allocation
      for (const b of buys) {
        const payload = {
          companyId: b.companyId,
          buyDate: tradeDate,
          quantity: b.qty,
          balanceQty: b.qty,
          avgPrice: b.price,
          soldOut: false,
        };
        await client.models.HoldingFIFO.create(payload);
        const { data: sLot } = await client.models.HoldingSpecificLot.create(payload);
        if (!portfolio.some((p) => p.companyId === b.companyId)) {
          await client.models.PortfolioItem.create({ companyId: b.companyId });
          portfolio.push({ companyId: b.companyId });
        }
        const { data: det } = await client.models.TradeDetail.create({
          tradeBookId,
          companyId: b.companyId,
          symbol: b.symbol,
          exchange: b.exchange,
          tradeType: 'DELIVERY',
          side: 'BUY',
          quantity: b.qty,
          price: b.price,
        });
        if (sLot && det) {
          await client.models.TradeLotAllocation.create({
            tradeDetailId: det.id,
            specificLotId: sLot.id,
            quantity: b.qty,
            kind: 'OPEN',
          });
        }
        tick();
      }

      // Delivery SELLS -> reduce FIFO (oldest) + specific (chosen) + REDUCE allocations
      for (let i = 0; i < sells.length; i++) {
        const sell = sells[i];
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

        // Specific: reduce chosen lots + REDUCE allocations
        const lotById = Object.fromEntries(
          (specByCompany[sell.companyId] || []).map((l) => [l.id, l])
        );
        for (const [lotId, q] of Object.entries(sellAlloc(i))) {
          const qty = Number(q) || 0;
          if (qty <= 0) continue;
          const lot = lotById[lotId];
          const bal = lot.balanceQty ?? lot.quantity;
          const newBal = bal - qty;
          await client.models.HoldingSpecificLot.update({
            id: lotId,
            balanceQty: newBal,
            soldOut: newBal <= 1e-9,
          });
          if (det) {
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

      // record an outstanding recovery entry for each company that had a net
      // intraday LOSS on this day
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
      setTradeDate(null);
      load();
    } catch (e) {
      message.error(`Processing failed: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }

  // ---- render --------------------------------------------------------------

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
          <Button>{hasFile ? 'Choose another file' : 'Choose tradebook CSV'}</Button>
        </Upload>
        <Select
          style={{ minWidth: 180 }}
          placeholder="Broker"
          value={brokerId}
          onChange={setBrokerId}
          options={brokers.map((b) => ({ label: b.name, value: b.id }))}
          notFoundContent="No brokers — add one under Master data › Brokers"
        />
        <Button
          type="primary"
          loading={processing}
          disabled={!hasFile || !allSellsAllocated}
          onClick={process}
        >
          Process trades
        </Button>
      </div>

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
                </Space>

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
                    { title: 'Buy date', dataIndex: 'buyDate' },
                    {
                      title: 'Buy price',
                      dataIndex: 'avgPrice',
                      align: 'right',
                      render: money,
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

      <Divider orientation="left">Processed daily trades</Divider>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={historyRows}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        columns={[
          { title: 'Date', dataIndex: 'tradeDate', width: 130 },
          { title: 'Buys', dataIndex: 'buyCount', align: 'right', width: 70 },
          { title: 'Sells', dataIndex: 'sellCount', align: 'right', width: 70 },
          { title: 'Intraday', dataIndex: 'intradayCount', align: 'right', width: 90 },
          {
            title: 'Realized P&L',
            dataIndex: 'realizedPnl',
            align: 'right',
            render: pnlSpan,
          },
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
            render: (_, b) => pnlSpan((b.realizedPnl || 0) - (b.charges || 0)),
          },
          {
            title: 'Broker',
            dataIndex: 'brokerId',
            width: 110,
            render: (id) => brokerById[id]?.name ?? '—',
          },
          { title: 'Note', dataIndex: 'note' },
          {
            title: '',
            key: 'view',
            width: 80,
            render: (_, book) => (
              <Button size="small" type="link" onClick={() => setViewBook(book)}>
                View
              </Button>
            ),
          },
        ]}
        locale={{ emptyText: 'No daily trades processed yet.' }}
      />

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
                  rowExpandable: (d) => (allocByDetail[d.id] || []).length > 0,
                  expandedRowRender: (d) => (
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
                  ),
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
                .sort((a, b) => (a.buyDate < b.buyDate ? -1 : 1))}
              columns={[
                { title: 'Buy date', dataIndex: 'buyDate' },
                { title: 'Buy price', dataIndex: 'avgPrice', align: 'right', render: money },
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
