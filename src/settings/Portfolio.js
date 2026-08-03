import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import dayjs from 'dayjs';
import {
  Table,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Popconfirm,
  Typography,
  Modal,
  Statistic,
  Card,
  Alert,
  Tag,
  Progress,
  Segmented,
  message,
} from 'antd';
import HoldingsByDate from './HoldingsByDate';
import ReconcileHoldings from './ReconcileHoldings';
import LotRecovery from './LotRecovery';
import StockHistory from './StockHistory';

const client = generateClient();

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

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Parse pasted broker text: Date  Qty  Price  [Age]  [P&L]
function parseLots(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(/\s+/);
      const date = (cols[0] || '').trim();
      const qty = Number((cols[1] || '').replace(/,/g, ''));
      const price = Number((cols[2] || '').replace(/,/g, ''));
      let status = 'ok';
      let reason = '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        status = 'error';
        reason = 'Date must be YYYY-MM-DD';
      } else if (!Number.isFinite(qty) || qty <= 0) {
        status = 'error';
        reason = 'Bad quantity';
      } else if (!Number.isFinite(price) || price < 0) {
        status = 'error';
        reason = 'Bad price';
      }
      return { date, qty, price, status, reason };
    });
}

const sortLots = (lots) =>
  [...lots].sort((a, b) => (a.buyDate < b.buyDate ? 1 : -1));

function aggregate(lots) {
  const m = {};
  lots.forEach((l) => {
    const bal = l.balanceQty ?? l.quantity;
    // keep sold-down lots that are "recovering" so they stay in the dialog
    if (bal <= 0 && !l.recovering) return;
    const g = (m[l.companyId] = m[l.companyId] || { lots: [], qty: 0, cost: 0 });
    g.lots.push(l);
    if (bal > 0) {
      g.qty += bal;
      g.cost += bal * l.avgPrice;
    }
  });
  return m;
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [fifoLots, setFifoLots] = useState([]);
  const [specLots, setSpecLots] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [swings, setSwings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Add Portfolio modal
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [pasteText, setPasteText] = useState('');

  // Edit holding modal
  const [editRow, setEditRow] = useState(null); // portfolio row being edited
  const [editLots, setEditLots] = useState([]); // [{ key, buyDate, quantity, avgPrice }]
  const [editPaste, setEditPaste] = useState('');
  const [lotEditor, setLotEditor] = useState(null); // single-lot dialog

  // read-only lot view (click an average)
  const [lotView, setLotView] = useState(null);
  const [byDateOpen, setByDateOpen] = useState(false);
  const [historyRow, setHistoryRow] = useState(null); // stock history dialog
  const [recoveryCompany, setRecoveryCompany] = useState(null); // recovery details dialog
  const [search, setSearch] = useState('');
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [pnlBasis, setPnlBasis] = useState('SPECIFIC'); // default specific-lot
  const [benchRow, setBenchRow] = useState(null); // row whose benchmark is being set
  const [benchValue, setBenchValue] = useState(null);
  const [benchSaving, setBenchSaving] = useState(false);
  const [benchBulkSaving, setBenchBulkSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      if (!client.models.HoldingFIFO) {
        message.error('Holdings model not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      const active = { soldOut: { ne: true } };
      const [pf, f, s, co, q, sw] = await Promise.all([
        listAll(client.models.PortfolioItem),
        listAll(client.models.HoldingFIFO, active),
        listAll(client.models.HoldingSpecificLot, active),
        listAll(client.models.Company),
        client.models.CurrentQuote ? listAll(client.models.CurrentQuote) : [],
        client.models.RecoverySwing ? listAll(client.models.RecoverySwing) : [],
      ]);
      setPortfolio(pf);
      setFifoLots(f);
      setSpecLots(s);
      setCompanies(co);
      setQuotes(q);
      setSwings(sw);
    } catch (e) {
      message.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies]
  );
  // current price per company (close preferred, fall back to ltp)
  const priceByCompany = useMemo(() => {
    const m = {};
    quotes.forEach((q) => (m[q.companyId] = q.close ?? q.ltp ?? null));
    return m;
  }, [quotes]);

  const portfolioByCompany = useMemo(
    () => Object.fromEntries(portfolio.map((p) => [p.companyId, p])),
    [portfolio]
  );

  const rows = useMemo(() => {
    const f = aggregate(fifoLots);
    const s = aggregate(specLots);
    const cids = new Set([
      ...Object.keys(f),
      ...Object.keys(s),
      ...portfolio.map((p) => p.companyId),
    ]);
    return [...cids]
      .map((cid) => {
        const ff = f[cid] || { lots: [], qty: 0, cost: 0 };
        const ss = s[cid] || { lots: [], qty: 0, cost: 0 };
        const price = priceByCompany[cid];
        const marketValue = price != null ? ff.qty * price : null;
        const benchmarkQty = portfolioByCompany[cid]?.benchmarkQty ?? null;
        return {
          key: cid,
          companyId: cid,
          companyName: companyById[cid]?.name ?? '—',
          qty: ff.qty,
          specQty: ss.qty,
          benchmarkQty,
          buyBack: benchmarkQty != null ? Math.max(0, benchmarkQty - ff.qty) : null,
          fifoAvg: ff.qty > 0 ? ff.cost / ff.qty : 0,
          fifoInvested: ff.cost,
          fifoLots: sortLots(ff.lots),
          specAvg: ss.qty > 0 ? ss.cost / ss.qty : 0,
          specInvested: ss.cost,
          specLots: sortLots(ss.lots),
          ltp: price,
          marketValue,
          pnl: marketValue != null ? marketValue - ff.cost : null,
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [fifoLots, specLots, portfolio, companyById, priceByCompany, portfolioByCompany]);

  const inPortfolio = useMemo(() => new Set(rows.map((r) => r.companyId)), [rows]);

  // grid filter by company name or ISIN
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.companyName || '').toLowerCase().includes(q) ||
        (companyById[r.companyId]?.ISIN || '').toLowerCase().includes(q)
    );
  }, [rows, search, companyById]);

  // watcher: companies where FIFO holding qty ≠ sum of specific-lot quantities
  const mismatches = useMemo(
    () =>
      rows
        .map((r) => ({ ...r, diff: (r.qty || 0) - (r.specQty || 0) }))
        .filter((r) => Math.abs(r.diff) > 1e-6)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    [rows]
  );

  const swingsByLot = useMemo(() => {
    const m = {};
    swings.forEach((s) => (m[s.specificLotId] = m[s.specificLotId] || []).push(s));
    return m;
  }, [swings]);

  // companies that have any recovering lot, with recovered/pending totals.
  // A lot counts as recovering if its flag is set OR it has an OPEN swing
  // (guards against data where the flag wasn't set but a swing exists).
  const recoveringByCompany = useMemo(() => {
    const openSwingLotIds = new Set(
      swings.filter((s) => s.status === 'OPEN').map((s) => s.specificLotId)
    );
    const m = {};
    specLots.forEach((l) => {
      if (!l.recovering && !openSwingLotIds.has(l.id)) return;
      const g = (m[l.companyId] = m[l.companyId] || {
        companyId: l.companyId,
        companyName: companyById[l.companyId]?.name ?? '—',
        lots: [],
      });
      g.lots.push(l);
    });
    return Object.values(m)
      .map((g) => {
        const cs = swings.filter((s) => s.companyId === g.companyId);
        const recovered = cs
          .filter((s) => s.status === 'CLOSED' && s.closeType === 'BUYBACK')
          .reduce((a, s) => a + (s.profit || 0), 0);
        const open = cs.filter((s) => s.status === 'OPEN');
        const pending = open.reduce((a, s) => a + (s.qty || 0), 0);
        // weighted avg sell price of the pending (open) swings — the level to
        // buy back below
        const avgSell =
          pending > 0
            ? open.reduce((a, s) => a + (s.sellPrice || 0) * (s.qty || 0), 0) / pending
            : null;
        const ltp = priceByCompany[g.companyId] ?? null;
        return { ...g, recovered, pending, avgSell, ltp };
      })
      // still recovering = has shares sold but not yet bought back; drop the
      // fully-bought-back ones (the recovering flag lingers after buy-back)
      .filter((g) => g.pending > 0)
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [specLots, swings, companyById, priceByCompany]);

  // live lots for the open dialog (re-derived from rows so it refreshes)
  const lotViewRow = lotView ? rows.find((r) => r.companyId === lotView.companyId) : null;
  const lotViewLots = lotViewRow
    ? lotView.method === 'FIFO'
      ? lotViewRow.fifoLots
      : lotViewRow.specLots
    : [];
  const lotViewLtp = lotViewRow?.ltp ?? null;

  // Add: only companies NOT already in the portfolio
  const addCompanyOptions = useMemo(
    () =>
      companies
        .filter((c) => !inPortfolio.has(c.id))
        .map((c) => ({ value: c.id, label: `${c.name} (${c.ISIN})` })),
    [companies, inPortfolio]
  );

  // invested / P&L based on the chosen cost basis (specific-lot by default)
  const investedOf = (r) => (pnlBasis === 'SPECIFIC' ? r.specInvested : r.fifoInvested);
  const pnlOf = (r) => (r.marketValue == null ? null : r.marketValue - investedOf(r));

  const totalMarket = useMemo(() => rows.reduce((s, r) => s + (r.marketValue ?? 0), 0), [rows]);
  const totalInvested = useMemo(
    () => rows.reduce((s, r) => s + investedOf(r), 0),
    [rows, pnlBasis]
  );
  const totalPnl = totalMarket - totalInvested;

  // shared: set a company's lots to `lots` (replace in BOTH holding tables)
  async function replaceCompanyLots(cid, lots) {
    const clear = async (model) => {
      const all = await listAll(model);
      for (const r of all.filter((x) => x.companyId === cid)) {
        await model.delete({ id: r.id });
      }
    };
    await clear(client.models.HoldingFIFO);
    await clear(client.models.HoldingSpecificLot);
    if (!portfolio.some((p) => p.companyId === cid)) {
      await client.models.PortfolioItem.create({ companyId: cid });
    }
    let done = 0;
    let failed = 0;
    for (const l of lots) {
      const payload = {
        companyId: cid,
        buyDate: l.buyDate,
        quantity: l.quantity,
        balanceQty: l.quantity,
        avgPrice: l.avgPrice,
        soldOut: false,
      };
      const a = await client.models.HoldingFIFO.create(payload);
      const b = await client.models.HoldingSpecificLot.create(payload);
      if (a.errors || b.errors) failed += 1;
      done += 1;
      setProgress(Math.round((done / lots.length) * 100));
    }
    return { done, failed };
  }

  // ---- Add Portfolio -------------------------------------------------------

  const parsed = useMemo(() => parseLots(pasteText), [pasteText]);
  const okRows = parsed.filter((r) => r.status === 'ok');
  const errorRows = parsed.filter((r) => r.status !== 'ok');

  function openAdd() {
    setCompanyId(null);
    setPasteText('');
    setAddOpen(true);
  }

  async function runAdd() {
    if (!companyId) return message.error('Pick a company first.');
    if (okRows.length === 0) return message.info('Nothing to import.');
    setSaving(true);
    setProgress(0);
    const lots = okRows.map((r) => ({
      buyDate: r.date,
      quantity: r.qty,
      avgPrice: r.price,
    }));
    const { done, failed } = await replaceCompanyLots(companyId, lots);
    setSaving(false);
    setAddOpen(false);
    if (failed) message.warning(`Added ${done - failed} lots, ${failed} failed.`);
    else message.success(`Added ${done} lots.`);
    load();
  }

  // ---- Edit holding --------------------------------------------------------

  function openEdit(row) {
    setEditRow(row);
    setEditPaste('');
    setEditLots(
      row.fifoLots.map((l) => ({
        key: l.id || uid(),
        buyDate: l.buyDate,
        quantity: l.quantity,
        avgPrice: l.avgPrice,
      }))
    );
  }

  function deleteEditLot(key) {
    setEditLots((prev) => prev.filter((l) => l.key !== key));
  }
  function openLotEditor(lot) {
    setLotEditor(
      lot
        ? { key: lot.key, buyDate: lot.buyDate, quantity: lot.quantity, avgPrice: lot.avgPrice }
        : { key: null, buyDate: dayjs().format('YYYY-MM-DD'), quantity: null, avgPrice: null }
    );
  }
  function saveLotEditor() {
    const l = lotEditor;
    if (!l.buyDate || !(l.quantity > 0) || !(l.avgPrice >= 0)) {
      return message.error('Date, quantity and price are required.');
    }
    if (l.key) {
      setEditLots((prev) =>
        prev.map((x) =>
          x.key === l.key
            ? { ...x, buyDate: l.buyDate, quantity: l.quantity, avgPrice: l.avgPrice }
            : x
        )
      );
    } else {
      setEditLots((prev) => [
        ...prev,
        { key: uid(), buyDate: l.buyDate, quantity: l.quantity, avgPrice: l.avgPrice },
      ]);
    }
    setLotEditor(null);
  }
  function appendPasteToEdit() {
    const p = parseLots(editPaste).filter((r) => r.status === 'ok');
    if (!p.length) return message.info('No valid rows to add.');
    setEditLots((prev) => [
      ...prev,
      ...p.map((r) => ({ key: uid(), buyDate: r.date, quantity: r.qty, avgPrice: r.price })),
    ]);
    setEditPaste('');
  }

  async function saveEdit() {
    const bad = editLots.find(
      (l) => !l.buyDate || !(l.quantity > 0) || !(l.avgPrice >= 0)
    );
    if (bad) return message.error('Every lot needs a date, quantity and price.');
    setSaving(true);
    setProgress(0);
    const lots = editLots.map((l) => ({
      buyDate: l.buyDate,
      quantity: l.quantity,
      avgPrice: l.avgPrice,
    }));
    const { failed } = await replaceCompanyLots(editRow.companyId, lots);
    setSaving(false);
    setEditRow(null);
    if (failed) message.warning(`Saved with ${failed} failures.`);
    else message.success('Holding updated.');
    load();
  }

  // ---- benchmark quantity --------------------------------------------------

  function openBenchmark(row) {
    setBenchRow(row);
    // default to the existing benchmark, or the current holding quantity
    setBenchValue(row.benchmarkQty != null ? row.benchmarkQty : row.qty);
  }

  async function saveBenchmark() {
    if (benchValue == null || benchValue < 0) {
      return message.error('Enter a valid benchmark quantity.');
    }
    setBenchSaving(true);
    try {
      const existing = portfolioByCompany[benchRow.companyId];
      if (existing) {
        await client.models.PortfolioItem.update({
          id: existing.id,
          benchmarkQty: benchValue,
        });
      } else {
        await client.models.PortfolioItem.create({
          companyId: benchRow.companyId,
          benchmarkQty: benchValue,
        });
      }
      message.success('Benchmark saved');
      setBenchRow(null);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setBenchSaving(false);
    }
  }

  async function setAllBenchmarks() {
    setBenchBulkSaving(true);
    try {
      for (const r of rows) {
        const existing = portfolioByCompany[r.companyId];
        if (existing) {
          await client.models.PortfolioItem.update({
            id: existing.id,
            benchmarkQty: r.qty,
          });
        } else {
          await client.models.PortfolioItem.create({
            companyId: r.companyId,
            benchmarkQty: r.qty,
          });
        }
      }
      message.success('Benchmarks set to current holdings');
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setBenchBulkSaving(false);
    }
  }

  // ---- misc ----------------------------------------------------------------

  function showLots(row, method) {
    // store the key + method, not a snapshot, so the dialog stays live after
    // recovery actions (buy-back / close) refresh the underlying lots.
    setLotView({ companyId: row.companyId, companyName: row.companyName, method });
  }

  async function removeCompany(cid) {
    const kill = async (model) => {
      const all = await listAll(model);
      for (const r of all.filter((x) => x.companyId === cid)) {
        await model.delete({ id: r.id });
      }
    };
    await kill(client.models.HoldingFIFO);
    await kill(client.models.HoldingSpecificLot);
    for (const p of portfolio.filter((x) => x.companyId === cid)) {
      await client.models.PortfolioItem.delete({ id: p.id });
    }
    message.success('Removed from portfolio');
    load();
  }

  const avgCell = (row, method) => (
    <Button type="link" style={{ padding: 0 }} onClick={() => showLots(row, method)}>
      {money(method === 'FIFO' ? row.fifoAvg : row.specAvg)}
    </Button>
  );

  const columns = [
    {
      title: 'Company',
      dataIndex: 'companyName',
      sorter: (a, b) => a.companyName.localeCompare(b.companyName),
      defaultSortOrder: 'ascend',
      render: (v, r) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto', textAlign: 'left', whiteSpace: 'normal' }}
          onClick={() => setHistoryRow(r)}
        >
          {v}
        </Button>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      align: 'right',
      sorter: (a, b) => (a.qty || 0) - (b.qty || 0),
      render: (v, r) => {
        // FIFO & specific totals should always match; flag if they don't
        const mismatch = Math.abs((r.qty || 0) - (r.specQty || 0)) > 1e-6;
        return (
          <span style={mismatch ? { color: '#cf1322', fontWeight: 600 } : undefined}>
            {v?.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      title: 'Benchmark',
      key: 'benchmark',
      align: 'right',
      render: (_, r) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => openBenchmark(r)}>
          {r.benchmarkQty != null ? r.benchmarkQty.toLocaleString('en-IN') : 'Set'}
        </Button>
      ),
    },
    {
      title: 'Buy back',
      dataIndex: 'buyBack',
      align: 'right',
      render: (v) =>
        v == null ? '—' : v > 0 ? (
          <span style={{ color: '#cf1322' }}>{v.toLocaleString('en-IN')}</span>
        ) : (
          '✓'
        ),
    },
    {
      title: 'FIFO avg',
      key: 'fifoAvg',
      align: 'right',
      sorter: (a, b) => a.fifoAvg - b.fifoAvg,
      render: (_, r) => avgCell(r, 'FIFO'),
    },
    {
      title: 'Specific avg',
      key: 'specAvg',
      align: 'right',
      sorter: (a, b) => a.specAvg - b.specAvg,
      render: (_, r) => avgCell(r, 'SPECIFIC'),
    },
    {
      title: 'LTP',
      dataIndex: 'ltp',
      align: 'right',
      render: (v) => (v == null ? '—' : money(v)),
    },
    {
      title: 'Invested',
      key: 'invested',
      align: 'right',
      sorter: (a, b) => investedOf(a) - investedOf(b),
      render: (_, r) => money(investedOf(r)),
    },
    {
      title: 'Mkt value',
      dataIndex: 'marketValue',
      align: 'right',
      sorter: (a, b) => (a.marketValue ?? 0) - (b.marketValue ?? 0),
      render: (v) => (v == null ? '—' : money(v)),
    },
    {
      title: 'P&L',
      key: 'pnl',
      align: 'right',
      sorter: (a, b) => (pnlOf(a) ?? 0) - (pnlOf(b) ?? 0),
      render: (_, r) => {
        const v = pnlOf(r);
        return v == null ? (
          '—'
        ) : (
          <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{money(v)}</span>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 210,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => setHistoryRow(r)}>
            History
          </Button>
          <Button size="small" type="link" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Remove this company and all its lots?"
            onConfirm={() => removeCompany(r.companyId)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger type="text">
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lotColumns = [
    { title: 'Buy date', dataIndex: 'buyDate' },
    {
      title: 'Bought qty',
      dataIndex: 'quantity',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
    },
    {
      title: 'Balance qty',
      dataIndex: 'balanceQty',
      align: 'right',
      render: (v, r) => (v ?? r.quantity)?.toLocaleString('en-IN'),
    },
    { title: 'Avg price', dataIndex: 'avgPrice', align: 'right', render: money },
  ];

  const previewColumns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Qty', dataIndex: 'qty', align: 'right' },
    { title: 'Price', dataIndex: 'price', align: 'right', render: money },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) =>
        r.status === 'ok' ? <Tag color="green">OK</Tag> : <Tag color="red">{r.reason}</Tag>,
    },
  ];

  // Edit grid: one row per day (summary); expand to see that day's lots.
  const daySummaries = useMemo(() => {
    const map = {};
    editLots.forEach((l) => {
      const g = (map[l.buyDate] = map[l.buyDate] || {
        key: l.buyDate,
        buyDate: l.buyDate,
        lots: [],
        qty: 0,
        cost: 0,
      });
      g.lots.push(l);
      g.qty += l.quantity || 0;
      g.cost += (l.quantity || 0) * (l.avgPrice || 0);
    });
    return Object.values(map)
      .map((g) => ({ ...g, avgPrice: g.qty > 0 ? g.cost / g.qty : 0 }))
      .sort((a, b) => (a.buyDate < b.buyDate ? 1 : -1));
  }, [editLots]);

  const summaryColumns = [
    {
      title: 'Buy date',
      dataIndex: 'buyDate',
      render: (v) => dayjs(v).format('DD MMM YYYY'),
    },
    {
      title: 'Lots',
      dataIndex: 'lots',
      align: 'right',
      width: 70,
      render: (l) => l.length,
    },
    {
      title: 'Total qty',
      dataIndex: 'qty',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
    },
    { title: 'Avg price', dataIndex: 'avgPrice', align: 'right', render: money },
  ];

  const lotDetailColumns = [
    {
      title: 'Qty',
      dataIndex: 'quantity',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
    },
    { title: 'Avg price', dataIndex: 'avgPrice', align: 'right', render: money },
    {
      title: '',
      key: 'act',
      width: 130,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openLotEditor(r)}>
            Edit
          </Button>
          <Button size="small" danger type="text" onClick={() => deleteEditLot(r.key)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Portfolio
        </Typography.Title>
        <Typography.Text type="secondary">
          Holdings by company. Click an average to see the lots behind it.
        </Typography.Text>
      </div>

      <Card size="small">
        <Space size="large" wrap>
          <Statistic title="Companies" value={rows.length} />
          <Statistic
            title={`Invested (${pnlBasis === 'SPECIFIC' ? 'Specific' : 'FIFO'})`}
            value={money(totalInvested)}
          />
          <Statistic title="Market value" value={money(totalMarket)} />
          <Statistic
            title="Overall P&L"
            value={money(totalPnl)}
            valueStyle={{ color: totalPnl >= 0 ? '#3f8600' : '#cf1322' }}
          />
          <div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>P&L basis</div>
            <Segmented
              size="small"
              value={pnlBasis}
              onChange={setPnlBasis}
              options={[
                { label: 'Specific', value: 'SPECIFIC' },
                { label: 'FIFO', value: 'FIFO' },
              ]}
            />
          </div>
        </Space>
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Input
          allowClear
          placeholder="Search company or ISIN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <Space wrap>
          <Popconfirm
            title="Set every company's benchmark to its current holding quantity?"
            description="This overwrites any existing benchmarks."
            onConfirm={setAllBenchmarks}
            okText="Set all"
          >
            <Button loading={benchBulkSaving}>Benchmarks = holdings</Button>
          </Popconfirm>
          <Button onClick={() => setReconcileOpen(true)}>Reconcile with broker</Button>
          <Button onClick={() => setByDateOpen(true)}>Holdings by date</Button>
          <Button type="primary" onClick={openAdd}>
            Add Portfolio
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1, minHeight: 0 }}>
        {/* holdings grid — scrolls internally to fit the window height */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Table
            rowKey="key"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            pagination={{ pageSize: 100, hideOnSinglePage: true, position: ['bottomCenter'] }}
            scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
            locale={{
              emptyText: search
                ? 'No matching companies.'
                : 'No holdings yet — click Add Portfolio.',
            }}
          />
        </div>

        {/* fixed right panel */}
        <div
          style={{
            width: 360,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
        <Card
          size="small"
          title="Watchers"
          styles={{ body: { padding: 0, maxHeight: 'calc(50vh - 160px)', overflow: 'auto' } }}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <Typography.Text strong>Holding qty mismatch</Typography.Text>
            <div style={{ fontSize: 12, color: '#888' }}>
              FIFO qty ≠ sum of specific lots
            </div>
          </div>
          {mismatches.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#3f8600' }}>
              ✓ All holdings match
            </div>
          ) : (
            <Table
              rowKey="companyId"
              size="small"
              showHeader
              pagination={false}
              dataSource={mismatches}
              columns={[
                {
                  title: 'Company',
                  dataIndex: 'companyName',
                  ellipsis: true,
                  render: (v, r) => (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => setHistoryRow(r)}
                    >
                      {v}
                    </Button>
                  ),
                },
                { title: 'FIFO', dataIndex: 'qty', align: 'right', width: 56 },
                { title: 'Lots', dataIndex: 'specQty', align: 'right', width: 56 },
                {
                  title: 'Δ',
                  dataIndex: 'diff',
                  align: 'right',
                  width: 52,
                  render: (v) => (
                    <span style={{ color: '#cf1322' }}>
                      {v > 0 ? '+' : ''}
                      {v.toLocaleString('en-IN')}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Card>

        <Card
          size="small"
          title="Recovering lots"
          styles={{ body: { padding: 0, maxHeight: 'calc(50vh - 120px)', overflow: 'auto' } }}
        >
          {recoveringByCompany.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#888' }}>
              No recovering lots.
            </div>
          ) : (
            <Table
              rowKey="companyId"
              size="small"
              pagination={false}
              dataSource={recoveringByCompany}
              columns={[
                {
                  title: 'Company',
                  dataIndex: 'companyName',
                  ellipsis: true,
                  render: (v, r) => (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => setRecoveryCompany(r)}
                    >
                      {v}
                    </Button>
                  ),
                },
                {
                  title: 'LTP',
                  dataIndex: 'ltp',
                  align: 'right',
                  width: 78,
                  render: (v, r) =>
                    v == null ? (
                      '—'
                    ) : (
                      // green when below the avg sell → good level to buy back
                      <span
                        style={{
                          color: r.avgSell != null && v < r.avgSell ? '#3f8600' : '#cf1322',
                        }}
                      >
                        {money(v)}
                      </span>
                    ),
                },
                {
                  title: 'Avg sell',
                  dataIndex: 'avgSell',
                  align: 'right',
                  width: 84,
                  render: (v) => (v == null ? '—' : money(v)),
                },
                { title: 'Pending', dataIndex: 'pending', align: 'right', width: 62 },
              ]}
            />
          )}
        </Card>
        </div>
      </div>

      {/* read-only lot view */}
      <Modal
        title={
          lotView
            ? `${lotView.companyName} — ${lotView.method === 'FIFO' ? 'FIFO' : 'Specific-lot'} holdings`
            : ''
        }
        open={!!lotView}
        onCancel={() => setLotView(null)}
        footer={null}
        width={640}
      >
        {lotView?.method === 'SPECIFIC' && (
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Expand a lot to short-trade it for loss recovery (sell now, buy back
            cheaper) and see its recovery scorecard.
          </Typography.Text>
        )}
        <Table
          rowKey="id"
          size="small"
          columns={lotColumns}
          dataSource={lotViewLots}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          expandable={
            lotView?.method === 'SPECIFIC'
              ? {
                  // only recovering lots (or ones with swing history) expand
                  rowExpandable: (lot) =>
                    !!lot.recovering || (swingsByLot[lot.id] || []).length > 0,
                  expandedRowRender: (lot) => (
                    <LotRecovery
                      lot={lot}
                      ltp={lotViewLtp}
                      swings={swingsByLot[lot.id] || []}
                      onChange={load}
                    />
                  ),
                }
              : undefined
          }
        />
      </Modal>

      {/* Holdings by date */}
      <Modal
        title="Holdings by Date"
        open={byDateOpen}
        onCancel={() => setByDateOpen(false)}
        footer={null}
        width={820}
        destroyOnClose
      >
        <HoldingsByDate />
      </Modal>

      {/* Per-stock holding history */}
      <Modal
        title={historyRow ? `Company — ${historyRow.companyName}` : ''}
        open={!!historyRow}
        onCancel={() => setHistoryRow(null)}
        footer={null}
        width="92vw"
        style={{ top: 24, maxWidth: 1400 }}
        styles={{ body: { maxHeight: 'calc(100vh - 140px)', overflow: 'auto' } }}
        destroyOnClose
      >
        {historyRow && <StockHistory companyId={historyRow.companyId} onChange={load} />}
      </Modal>

      {/* Recovery details for a company */}
      <Modal
        title={recoveryCompany ? `Recovery — ${recoveryCompany.companyName}` : ''}
        open={!!recoveryCompany}
        onCancel={() => setRecoveryCompany(null)}
        footer={null}
        width={820}
        destroyOnClose
      >
        {recoveryCompany && (
          <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
            <Space size="large" wrap>
              <Statistic
                title="Recovered"
                value={money(recoveryCompany.recovered)}
                valueStyle={{ color: recoveryCompany.recovered >= 0 ? '#3f8600' : '#cf1322' }}
              />
              <Statistic title="Pending (sold, not bought back)" value={recoveryCompany.pending} />
              <Statistic title="Recovering lots" value={recoveryCompany.lots.length} />
            </Space>
            {recoveryCompany.lots
              .slice()
              .sort((a, b) => String(a.buyDate).localeCompare(String(b.buyDate)))
              .map((lot) => (
                <Card
                  key={lot.id}
                  size="small"
                  title={`Lot ${dayjs(lot.buyDate).format('DD MMM YYYY')} @ ${money(lot.avgPrice)}`}
                >
                  <LotRecovery
                    lot={lot}
                    ltp={priceByCompany[lot.companyId] ?? null}
                    swings={swingsByLot[lot.id] || []}
                    onChange={load}
                  />
                </Card>
              ))}
          </Space>
        )}
      </Modal>

      {/* Set benchmark quantity */}
      <Modal
        title={benchRow ? `Benchmark — ${benchRow.companyName}` : ''}
        open={!!benchRow}
        onCancel={() => setBenchRow(null)}
        onOk={saveBenchmark}
        okText="Save"
        okButtonProps={{ loading: benchSaving }}
        destroyOnClose
      >
        {benchRow && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text type="secondary">
              Current holding: {benchRow.qty?.toLocaleString('en-IN')}. Set the
              target quantity to maintain — you'll be prompted to buy back if you
              drop below it.
            </Typography.Text>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              value={benchValue}
              onChange={setBenchValue}
              addonBefore="Benchmark qty"
            />
          </Space>
        )}
      </Modal>

      {/* Reconcile with broker */}
      <Modal
        title="Reconcile with broker"
        open={reconcileOpen}
        onCancel={() => setReconcileOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <ReconcileHoldings />
      </Modal>

      {/* Add Portfolio */}
      <Modal
        title="Add Portfolio"
        open={addOpen}
        onCancel={() => (saving ? null : setAddOpen(false))}
        onOk={runAdd}
        okText={okRows.length ? `Add ${okRows.length} lots` : 'Add'}
        okButtonProps={{ disabled: !companyId || okRows.length === 0, loading: saving }}
        width={720}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          <Form layout="vertical" style={{ marginBottom: 0 }}>
            <Form.Item label="Company (not yet in portfolio)" required style={{ marginBottom: 8 }}>
              <Select
                showSearch
                placeholder="Search company by name or ISIN"
                optionFilterProp="label"
                options={addCompanyOptions}
                value={companyId}
                onChange={setCompanyId}
              />
            </Form.Item>
          </Form>

          <div>
            <Typography.Text strong>Paste lots</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
              Copy rows from your broker's holdings breakdown. Expected:
              Date&nbsp;&nbsp;Qty&nbsp;&nbsp;Price (extra columns ignored).
            </Typography.Paragraph>
            <Input.TextArea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'2026-06-29\t40\t12.35\n2026-06-22\t10\t12.66'}
            />
          </div>

          {parsed.length > 0 && (
            <>
              <Alert
                type="info"
                showIcon
                message={`${okRows.length} lots ready · ${errorRows.length} errors`}
              />
              {saving && <Progress percent={progress} />}
              <Table
                rowKey={(_, i) => i}
                size="small"
                columns={previewColumns}
                dataSource={parsed}
                pagination={{ pageSize: 8, hideOnSinglePage: true }}
                scroll={{ y: 240 }}
              />
            </>
          )}
        </Space>
      </Modal>

      {/* Edit holding */}
      <Modal
        title={editRow ? `Edit holding — ${editRow.companyName}` : ''}
        open={!!editRow}
        onCancel={() => (saving ? null : setEditRow(null))}
        onOk={saveEdit}
        okText="Save"
        okButtonProps={{ loading: saving }}
        width={720}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          <Space>
            <Button onClick={() => openLotEditor(null)}>+ Add lot</Button>
            <Typography.Text type="secondary">
              {editLots.length} lot(s)
            </Typography.Text>
          </Space>
          {saving && <Progress percent={progress} />}
          <Table
            rowKey="key"
            size="small"
            columns={summaryColumns}
            dataSource={daySummaries}
            pagination={false}
            scroll={{ y: 320 }}
            expandable={{
              expandedRowRender: (day) => (
                <Table
                  rowKey="key"
                  size="small"
                  columns={lotDetailColumns}
                  dataSource={day.lots}
                  pagination={false}
                />
              ),
            }}
          />
          <div>
            <Typography.Text type="secondary">
              Or paste more lots to append:
            </Typography.Text>
            <Input.TextArea
              rows={3}
              value={editPaste}
              onChange={(e) => setEditPaste(e.target.value)}
              placeholder={'2026-06-29\t40\t12.35'}
              style={{ marginTop: 4 }}
            />
            <Button size="small" style={{ marginTop: 6 }} onClick={appendPasteToEdit}>
              Append pasted lots
            </Button>
          </div>
        </Space>
      </Modal>

      {/* single-lot editor dialog */}
      <Modal
        title={lotEditor?.key ? 'Edit lot' : 'Add lot'}
        open={!!lotEditor}
        onCancel={() => setLotEditor(null)}
        onOk={saveLotEditor}
        okText="Save"
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="Buy date" required>
            <DatePicker
              style={{ width: '100%' }}
              format="DD MMM YYYY"
              value={lotEditor?.buyDate ? dayjs(lotEditor.buyDate) : null}
              onChange={(d) =>
                setLotEditor((p) => ({ ...p, buyDate: d ? d.format('YYYY-MM-DD') : null }))
              }
            />
          </Form.Item>
          <Form.Item label="Quantity" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              value={lotEditor?.quantity}
              onChange={(v) => setLotEditor((p) => ({ ...p, quantity: v }))}
            />
          </Form.Item>
          <Form.Item label="Avg price (₹)" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              value={lotEditor?.avgPrice}
              onChange={(v) => setLotEditor((p) => ({ ...p, avgPrice: v }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
