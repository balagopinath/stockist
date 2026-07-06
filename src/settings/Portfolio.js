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
    if (bal <= 0) return;
    const g = (m[l.companyId] = m[l.companyId] || { lots: [], qty: 0, cost: 0 });
    g.lots.push(l);
    g.qty += bal;
    g.cost += bal * l.avgPrice;
  });
  return m;
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [fifoLots, setFifoLots] = useState([]);
  const [specLots, setSpecLots] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [quotes, setQuotes] = useState([]);
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
      const [pf, f, s, co, q] = await Promise.all([
        listAll(client.models.PortfolioItem),
        listAll(client.models.HoldingFIFO, active),
        listAll(client.models.HoldingSpecificLot, active),
        listAll(client.models.Company),
        client.models.CurrentQuote ? listAll(client.models.CurrentQuote) : [],
      ]);
      setPortfolio(pf);
      setFifoLots(f);
      setSpecLots(s);
      setCompanies(co);
      setQuotes(q);
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
    setLotView({
      companyName: row.companyName,
      method,
      lots: method === 'FIFO' ? row.fifoLots : row.specLots,
    });
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
    },
    {
      title: 'Total qty',
      dataIndex: 'qty',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
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
      width: 150,
      render: (_, r) => (
        <Space size="small">
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
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
      </div>

      <Table
        rowKey="key"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: 25,
          hideOnSinglePage: true,
          position: ['bottomCenter'],
        }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'No holdings yet — click Add Portfolio.' }}
      />

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
        <Table
          rowKey="id"
          size="small"
          columns={lotColumns}
          dataSource={lotView?.lots ?? []}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
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
