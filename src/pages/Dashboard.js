import { useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import { useAuth } from '../auth/AuthContext';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import StockHistory from '../settings/StockHistory';
import {
  Button,
  Card,
  Space,
  Statistic,
  Table,
  Typography,
  Dropdown,
  Empty,
  InputNumber,
  Select,
  Tabs,
  Modal,
  Input,
  message,
} from 'antd';

const Grid = WidthProvider(GridLayout);
const client = generateClient();

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Over-benchmark widget: stocks held above target, with inline benchmark set.
function OverBenchmarkWidget({ data, reload }) {
  const [pending, setPending] = useState({}); // companyId -> value
  const [savingId, setSavingId] = useState(null);
  const rows = (data.rows || []).filter((r) => r.benchmark == null || r.qty > r.benchmark);

  async function save(r) {
    const val = pending[r.companyId] ?? r.benchmark ?? r.qty;
    if (val == null || val < 0) return;
    setSavingId(r.companyId);
    try {
      if (r.portfolioItemId) {
        await client.models.PortfolioItem.update({
          id: r.portfolioItemId,
          benchmarkQty: val,
        });
      } else {
        await client.models.PortfolioItem.create({
          companyId: r.companyId,
          benchmarkQty: val,
        });
      }
      message.success('Benchmark set');
      reload && reload();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Table
      rowKey="companyId"
      size="small"
      dataSource={rows}
      pagination={{ pageSize: 6, hideOnSinglePage: true }}
      locale={{ emptyText: 'No stocks above benchmark.' }}
      columns={[
        { title: 'Company', dataIndex: 'companyName' },
        {
          title: 'Qty',
          dataIndex: 'qty',
          align: 'right',
          render: (v) => v?.toLocaleString('en-IN'),
        },
        {
          title: 'Benchmark',
          dataIndex: 'benchmark',
          align: 'right',
          render: (v) => (v == null ? '—' : v.toLocaleString('en-IN')),
        },
        {
          title: 'Excess',
          align: 'right',
          render: (_, r) =>
            r.benchmark == null ? (
              '—'
            ) : (
              <span style={{ color: '#3f8600' }}>
                {(r.qty - r.benchmark).toLocaleString('en-IN')}
              </span>
            ),
        },
        {
          title: 'Set benchmark',
          align: 'right',
          width: 190,
          render: (_, r) => (
            <Space size="small">
              <InputNumber
                size="small"
                min={0}
                style={{ width: 90 }}
                value={pending[r.companyId] ?? r.benchmark ?? r.qty}
                onChange={(v) => setPending((p) => ({ ...p, [r.companyId]: v }))}
              />
              <Button
                size="small"
                type="primary"
                loading={savingId === r.companyId}
                onClick={() => save(r)}
              >
                Set
              </Button>
            </Space>
          ),
        },
      ]}
    />
  );
}

// Sell-opportunities widget with a min-profit filter (needs local state).
function SellOpsWidget({ data }) {
  const [minProfit, setMinProfit] = useState(0);
  const rows = (data.sellOps || []).filter((op) => op.profit >= (minProfit || 0));
  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
      >
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #888)' }}>
          Min profit ₹
        </span>
        <InputNumber
          size="small"
          min={0}
          value={minProfit}
          onChange={(v) => setMinProfit(v || 0)}
          style={{ width: 120 }}
        />
      </div>
      <Table
        rowKey="companyId"
        size="small"
        dataSource={rows}
        pagination={{ pageSize: 6, hideOnSinglePage: true }}
        locale={{
          emptyText:
            (data.sellOps || []).length === 0
              ? 'No lots in profit (needs current prices).'
              : 'No lots above the minimum profit.',
        }}
        columns={[
          { title: 'Company', dataIndex: 'companyName' },
          { title: 'Sell price', dataIndex: 'price', align: 'right', render: money },
          { title: 'Lots', dataIndex: 'count', align: 'right' },
          {
            title: 'Qty',
            dataIndex: 'qty',
            align: 'right',
            render: (v) => v?.toLocaleString('en-IN'),
          },
          {
            title: 'Potential profit',
            dataIndex: 'profit',
            align: 'right',
            render: (v) => <span style={{ color: '#3f8600' }}>{money(v)}</span>,
          },
        ]}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={r.lots}
              columns={[
                { title: 'Buy date', dataIndex: 'buyDate' },
                { title: 'Buy price', dataIndex: 'avgPrice', align: 'right', render: money },
                {
                  title: 'Sell price',
                  align: 'right',
                  render: () => money(r.price),
                },
                { title: 'Qty', dataIndex: 'qty', align: 'right' },
                {
                  title: 'Profit / share',
                  dataIndex: 'perShare',
                  align: 'right',
                  render: (v) => <span style={{ color: '#3f8600' }}>{money(v)}</span>,
                },
                {
                  title: 'Profit',
                  dataIndex: 'profit',
                  align: 'right',
                  render: (v) => <span style={{ color: '#3f8600' }}>{money(v)}</span>,
                },
              ]}
            />
          ),
        }}
      />
    </div>
  );
}

// Admin widget: portfolio companies (across all users) with no industry set,
// with an inline industry picker to attach one.
function UnindustriedWidget({ data, reload }) {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState({}); // companyId -> industryId
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const rows = data.admin?.unindustried || [];
  const industryOptions = data.admin?.industryOptions || []; // basic industries

  const q = search.trim().toLowerCase();
  const dialogRows = q
    ? rows.filter(
        (r) =>
          r.companyName.toLowerCase().includes(q) ||
          (r.nseCode || '').toLowerCase().includes(q) ||
          (r.ISIN || '').toLowerCase().includes(q)
      )
    : rows;

  function openDialog() {
    setPicks({});
    setSearch('');
    setOpen(true);
  }

  async function saveAll() {
    const entries = Object.entries(picks).filter(([, v]) => v);
    if (entries.length === 0) {
      return message.warning('Pick an industry for at least one company.');
    }
    setSaving(true);
    try {
      for (const [companyId, industryId] of entries) {
        const { errors } = await client.models.Company.update({ id: companyId, industryId });
        if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      }
      message.success(
        `Attached industry to ${entries.length} compan${entries.length === 1 ? 'y' : 'ies'}.`
      );
      setOpen(false);
      reload && reload();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const pickedCount = Object.values(picks).filter(Boolean).length;

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          gap: 8,
        }}
      >
        <Typography.Text type="secondary">
          {rows.length} compan{rows.length === 1 ? 'y' : 'ies'} without an industry
        </Typography.Text>
        <Button type="primary" size="small" disabled={rows.length === 0} onClick={openDialog}>
          Attach industries
        </Button>
      </div>

      <Table
        rowKey="companyId"
        size="small"
        dataSource={rows}
        pagination={{ pageSize: 6, hideOnSinglePage: true }}
        locale={{ emptyText: 'Every portfolio company has an industry. 🎉' }}
        columns={[
          { title: 'Company', dataIndex: 'companyName' },
          { title: 'NSE', dataIndex: 'nseCode', width: 90, render: (v) => v || '—' },
          { title: 'ISIN', dataIndex: 'ISIN', render: (v) => v || '—' },
          {
            title: 'Held by',
            dataIndex: 'holders',
            align: 'right',
            width: 80,
            render: (v) => v ?? 1,
          },
        ]}
      />

      <Modal
        title="Attach basic industry"
        open={open}
        onCancel={() => (saving ? null : setOpen(false))}
        onOk={saveAll}
        okText={pickedCount ? `Save ${pickedCount}` : 'Save'}
        okButtonProps={{ loading: saving, disabled: pickedCount === 0 }}
        width={680}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Choose a Basic Industry for each company. Leave blank to skip.
        </Typography.Paragraph>
        <Input
          allowClear
          placeholder="Search by company, NSE code, or ISIN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Table
          rowKey="companyId"
          size="small"
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          dataSource={dialogRows}
          columns={[
            { title: 'Company', dataIndex: 'companyName' },
            { title: 'NSE', dataIndex: 'nseCode', width: 90, render: (v) => v || '—' },
            {
              title: 'Basic Industry',
              width: 300,
              render: (_, r) => (
                <Select
                  size="small"
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Select basic industry"
                  optionFilterProp="label"
                  value={picks[r.companyId]}
                  onChange={(v) => setPicks((p) => ({ ...p, [r.companyId]: v }))}
                  options={industryOptions}
                />
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
}

// Horizontal-bar allocation list (shared by the per-level allocation widgets).
function AllocBars({ items }) {
  const list = items || [];
  const total = list.reduce((a, x) => a + (x.invested || 0), 0) || 1;
  const top = [...list].sort((a, b) => b.invested - a.invested).slice(0, 12);
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      {top.length === 0 && <Empty description="No holdings" />}
      {top.map((r) => {
        const pct = Math.round((r.invested / total) * 100);
        return (
          <div key={r.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>
                {pct}% · {money(r.invested)}
              </span>
            </div>
            <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
              <div
                style={{
                  width: `${pct}%`,
                  background: r.name === 'Unclassified' ? '#bfbfbf' : '#1677ff',
                  height: 8,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        );
      })}
    </Space>
  );
}

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

// ---- widget registry ------------------------------------------------------
// Each widget: title, default grid size, and a render(data) function.
const WIDGETS = {
  summary: {
    title: 'Portfolio summary',
    size: { w: 4, h: 3 },
    render: (d) => (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Statistic title="Companies" value={d.companies} />
        <Space size="large" wrap>
          <Statistic title="Invested" value={money(d.totalSpec)} />
          <Statistic title="Market value" value={money(d.totalMarketValue)} />
          <Statistic
            title="Overall P&L"
            value={money(d.totalPnl)}
            valueStyle={{ color: (d.totalPnl ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
          />
        </Space>
      </Space>
    ),
  },
  holdings: {
    title: 'Holdings',
    size: { w: 8, h: 5 },
    render: (d) => (
      <Table
        rowKey="companyId"
        size="small"
        dataSource={d.rows}
        pagination={{ pageSize: 6, hideOnSinglePage: true }}
        columns={[
          { title: 'Company', dataIndex: 'companyName' },
          {
            title: 'Qty',
            dataIndex: 'qty',
            align: 'right',
            render: (v) => v?.toLocaleString('en-IN'),
          },
          { title: 'Avg cost', dataIndex: 'avg', align: 'right', render: money },
          {
            title: 'LTP',
            dataIndex: 'ltp',
            align: 'right',
            render: (v) => (v == null ? '—' : money(v)),
          },
          { title: 'Invested', dataIndex: 'invested', align: 'right', render: money },
          {
            title: 'Mkt value',
            dataIndex: 'marketValue',
            align: 'right',
            render: (v) => (v == null ? '—' : money(v)),
          },
          {
            title: 'P&L',
            dataIndex: 'pnl',
            align: 'right',
            render: (v) =>
              v == null ? (
                '—'
              ) : (
                <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{money(v)}</span>
              ),
          },
        ]}
      />
    ),
  },
  sellops: {
    title: 'Sell opportunities (profitable lots)',
    size: { w: 8, h: 5 },
    render: (d) => <SellOpsWidget data={d} />,
  },
  overbench: {
    title: 'Over benchmark (trim candidates)',
    size: { w: 8, h: 5 },
    render: (d, ctx) => <OverBenchmarkWidget data={d} reload={ctx?.reload} />,
  },
  buyback: {
    title: 'Buy-back opportunities (below benchmark)',
    size: { w: 8, h: 5 },
    render: (d, ctx) => {
      const ops = d.buyBackOps || [];
      const totalCost = ops.reduce((s, r) => s + (r.cost || 0), 0);
      const missing = ops.filter((r) => r.cost == null).length;
      return (
        <div>
          <div style={{ marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#888' }}>Capital to buy back all {ops.length}: </span>
            <strong style={{ color: '#1677ff' }}>{money(totalCost)}</strong>
            {missing > 0 && (
              <span style={{ color: '#888' }}>
                {' '}
                ({missing} without a live price — not included)
              </span>
            )}
          </div>
          <Table
        rowKey="companyId"
        size="small"
        dataSource={ops}
        pagination={{ pageSize: 6, hideOnSinglePage: true }}
        locale={{ emptyText: 'Nothing below benchmark.' }}
        columns={[
          {
            title: 'Company',
            dataIndex: 'companyName',
            render: (v, r) => (
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto', textAlign: 'left', whiteSpace: 'normal' }}
                onClick={() => ctx?.openCompany?.(r.companyId, r.companyName)}
              >
                {v}
              </Button>
            ),
          },
          { title: 'Have', dataIndex: 'currentQty', align: 'right' },
          { title: 'Target', dataIndex: 'benchmark', align: 'right' },
          {
            title: 'Buy back',
            dataIndex: 'shortfall',
            align: 'right',
            render: (v) => <span style={{ color: '#cf1322' }}>{v?.toLocaleString('en-IN')}</span>,
          },
          {
            title: 'Avg sold',
            dataIndex: 'avgSold',
            align: 'right',
            render: (v, r) =>
              v == null ? (
                '—'
              ) : (
                // green when current price is below the avg sold → buy back cheaper
                <span
                  style={{ color: r.price != null && r.price < v ? '#3f8600' : '#cf1322' }}
                >
                  {money(v)}
                </span>
              ),
          },
          {
            title: 'Price',
            dataIndex: 'price',
            align: 'right',
            render: (v) => (v == null ? '—' : money(v)),
          },
          {
            title: 'P/L %',
            dataIndex: 'plPct',
            align: 'right',
            render: (v) =>
              v == null ? (
                '—'
              ) : (
                <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
                  {v >= 0 ? '+' : ''}
                  {v.toFixed(2)}%
                </span>
              ),
          },
          {
            title: 'Cost',
            dataIndex: 'cost',
            align: 'right',
            render: (v) => (v == null ? '—' : money(v)),
          },
        ]}
          />
        </div>
      );
    },
  },
  // admin-only widget: portfolio companies missing an industry, attach inline.
  unindustried: {
    title: 'Portfolio companies missing an industry',
    admin: true,
    size: { w: 8, h: 5 },
    render: (d, ctx) => <UnindustriedWidget data={d} reload={ctx?.reload} />,
  },
  // admin-only widget: quick health check of the shared master data.
  masterhealth: {
    title: 'Master data health',
    admin: true,
    size: { w: 4, h: 3 },
    render: (d) => {
      const a = d.admin || {};
      return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space size="large" wrap>
            <Statistic title="Companies" value={a.companies ?? 0} />
            <Statistic title="Exchanges" value={a.exchanges ?? 0} />
            <Statistic title="Brokers" value={a.brokers ?? 0} />
          </Space>
          <Statistic title="Last price upload" value={a.lastUpload ?? '—'} />
        </Space>
      );
    },
  },
  allocation: {
    title: 'Allocation by company',
    size: { w: 4, h: 5 },
    render: (d) => {
      const total = d.totalSpec || 1;
      const top = [...d.rows].sort((a, b) => b.invested - a.invested).slice(0, 8);
      return (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {top.length === 0 && <Empty description="No holdings" />}
          {top.map((r) => {
            const pct = Math.round((r.invested / total) * 100);
            return (
              <div key={r.companyId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{r.companyName}</span>
                  <span>{pct}%</span>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      background: '#1677ff',
                      height: 8,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Space>
      );
    },
  },
  allocMacro: {
    title: 'Macro Economic Sector allocation',
    size: { w: 4, h: 5 },
    render: (d) => <AllocBars items={d.allocationByLevel?.[0]} />,
  },
  allocSector: {
    title: 'Sector allocation',
    size: { w: 4, h: 5 },
    render: (d) => <AllocBars items={d.allocationByLevel?.[1]} />,
  },
  allocIndustry: {
    title: 'Industry allocation',
    size: { w: 4, h: 5 },
    render: (d) => <AllocBars items={d.allocationByLevel?.[2]} />,
  },
  allocBasic: {
    title: 'Basic Industry allocation',
    size: { w: 4, h: 5 },
    render: (d) => <AllocBars items={d.allocationByLevel?.[3]} />,
  },
};

const DEFAULT_WIDGETS = [
  { i: 'w1', type: 'summary', x: 0, y: 0, w: 4, h: 3 },
  { i: 'w2', type: 'holdings', x: 4, y: 0, w: 8, h: 5 },
  { i: 'w3', type: 'allocation', x: 0, y: 3, w: 4, h: 5 },
];

const parseWidgets = (w) => {
  let v = w;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  return Array.isArray(v) ? v : [];
};

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [dashboards, setDashboards] = useState([]); // [{ id, name, widgets }]
  const [currentId, setCurrentId] = useState(null);
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [companyDialog, setCompanyDialog] = useState(null); // { companyId, companyName }
  const [data, setData] = useState({
    companies: 0,
    totalFifo: 0,
    totalSpec: 0,
    totalMarketValue: 0,
    totalPnl: 0,
    rows: [],
    sellOps: [],
    buyBackOps: [],
  });
  const loadedRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      // dashboards (one or more per user)
      const recs = await listAll(client.models.DashboardLayout);
      let dashes = recs
        .map((r) => ({ id: r.id, name: r.name || 'Dashboard', widgets: parseWidgets(r.widgets) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (dashes.length === 0) {
        const { data: created } = await client.models.DashboardLayout.create({
          name: 'Overview',
          widgets: JSON.stringify(DEFAULT_WIDGETS),
        });
        dashes = [{ id: created.id, name: 'Overview', widgets: DEFAULT_WIDGETS }];
      }
      setDashboards(dashes);
      // keep current selection if still present, else first
      const keep = dashes.find((d) => d.id === currentId) || dashes[0];
      setCurrentId(keep.id);
      setWidgets(keep.widgets.length ? keep.widgets : DEFAULT_WIDGETS);

      // who am I? used to scope personal widgets to my own portfolio, since an
      // admin's PortfolioItem.list() now returns every user's items.
      let mySub = null;
      let myUsername = null;
      try {
        const u = await getCurrentUser();
        mySub = u.userId;
        myUsername = u.username;
      } catch {
        /* not signed in — leave null */
      }

      // portfolio data for the widgets
      const active = { soldOut: { ne: true } };
      const [fifo, spec, companies, quotes, allPortfolio, exchanges, brokerList, uploads, industries, scripts, recSwings] =
        await Promise.all([
          listAll(client.models.HoldingFIFO, active),
          listAll(client.models.HoldingSpecificLot, active),
          listAll(client.models.Company),
          client.models.CurrentQuote ? listAll(client.models.CurrentQuote) : [],
          client.models.PortfolioItem ? listAll(client.models.PortfolioItem) : [],
          client.models.Exchange ? listAll(client.models.Exchange) : [],
          client.models.Broker ? listAll(client.models.Broker) : [],
          client.models.PriceUpload ? listAll(client.models.PriceUpload) : [],
          client.models.Industry ? listAll(client.models.Industry) : [],
          client.models.Script ? listAll(client.models.Script) : [],
          client.models.RecoverySwing
            ? listAll(client.models.RecoverySwing, { status: { eq: 'OPEN' } })
            : [],
        ]);
      // weighted avg sell price of OPEN recovery swings, per company
      const avgSoldByCompany = {};
      const soldQtyByCompany = {};
      recSwings.forEach((s) => {
        avgSoldByCompany[s.companyId] =
          (avgSoldByCompany[s.companyId] || 0) + (s.sellPrice || 0) * (s.qty || 0);
        soldQtyByCompany[s.companyId] = (soldQtyByCompany[s.companyId] || 0) + (s.qty || 0);
      });
      Object.keys(avgSoldByCompany).forEach((cid) => {
        avgSoldByCompany[cid] = soldQtyByCompany[cid]
          ? avgSoldByCompany[cid] / soldQtyByCompany[cid]
          : null;
      });
      // my own portfolio items (for the personal widgets)
      const isMine = (p) =>
        !mySub || !p.owner || p.owner.startsWith(mySub) || (myUsername && p.owner.includes(myUsername));
      const portfolio = allPortfolio.filter(isMine);
      const companyById = Object.fromEntries(companies.map((c) => [c.id, c]));
      // current price + prev close per company
      const priceByCompany = {};
      const prevCloseByCompany = {};
      quotes.forEach((q) => {
        priceByCompany[q.companyId] = q.close ?? q.ltp ?? null;
        prevCloseByCompany[q.companyId] = q.prevClose ?? null;
      });
      // benchmark (target qty) per company + its PortfolioItem id
      const benchInfo = {};
      portfolio.forEach((p) => {
        benchInfo[p.companyId] = { id: p.id, benchmarkQty: p.benchmarkQty ?? null };
      });

      const agg = (lots) => {
        const m = {};
        lots.forEach((l) => {
          const bal = l.balanceQty ?? l.quantity;
          if (bal <= 0) return;
          const g = (m[l.companyId] = m[l.companyId] || { qty: 0, cost: 0 });
          g.qty += bal;
          g.cost += bal * l.avgPrice;
        });
        return m;
      };
      const f = agg(fifo);
      const s = agg(spec);
      const rows = Object.keys(f).map((cid) => {
        const qty = f[cid].qty;
        const price = priceByCompany[cid];
        const marketValue = price != null ? qty * price : null;
        // default cost basis = specific-lot (fall back to FIFO if missing)
        const specInvested = s[cid]?.cost ?? f[cid].cost;
        return {
          companyId: cid,
          companyName: companyById[cid]?.name ?? '—',
          qty,
          avg: qty > 0 ? specInvested / qty : 0,
          invested: specInvested,
          ltp: price,
          marketValue,
          pnl: marketValue != null ? marketValue - specInvested : null,
          benchmark: benchInfo[cid]?.benchmarkQty ?? null,
          portfolioItemId: benchInfo[cid]?.id ?? null,
        };
      });
      const totalSpecInvested = Object.values(s).reduce((a, g) => a + g.cost, 0);
      const totalFifo = Object.values(f).reduce((a, g) => a + g.cost, 0);
      const totalMarketValue = rows.reduce((a, r) => a + (r.marketValue ?? 0), 0);

      // sell opportunities: profitable specific-lots per company (price > buy)
      const profByCompany = {};
      spec.forEach((l) => {
        const bal = l.balanceQty ?? l.quantity;
        if (bal <= 0) return;
        const price = priceByCompany[l.companyId];
        if (price == null) return;
        const perShare = price - l.avgPrice;
        if (perShare <= 0) return; // only lots in profit
        const g = (profByCompany[l.companyId] = profByCompany[l.companyId] || {
          companyId: l.companyId,
          companyName: companyById[l.companyId]?.name ?? '—',
          price,
          count: 0,
          qty: 0,
          profit: 0,
          lots: [],
        });
        g.count += 1;
        g.qty += bal;
        g.profit += perShare * bal;
        g.lots.push({
          id: l.id,
          buyDate: l.buyDate,
          avgPrice: l.avgPrice,
          qty: bal,
          perShare,
          profit: perShare * bal,
        });
      });
      const sellOps = Object.values(profByCompany).sort((a, b) => b.profit - a.profit);

      // buy-back opportunities: companies below their benchmark quantity
      const buyBackOps = [];
      portfolio.forEach((p) => {
        if (p.benchmarkQty == null) return;
        const currentQty = f[p.companyId]?.qty ?? 0;
        const shortfall = p.benchmarkQty - currentQty;
        if (shortfall <= 0) return;
        const price = priceByCompany[p.companyId];
        const prev = prevCloseByCompany[p.companyId];
        const dayChgPct = price != null && prev ? ((price - prev) / prev) * 100 : null;
        const avgSold = avgSoldByCompany[p.companyId] ?? null;
        // buy-back P/L %: what you'd gain buying back now vs your avg sold price
        // ((sold − now) / sold). Positive = profitable (buying below your sell).
        const plPct =
          avgSold != null && avgSold > 0 && price != null
            ? ((avgSold - price) / avgSold) * 100
            : null;
        buyBackOps.push({
          companyId: p.companyId,
          companyName: companyById[p.companyId]?.name ?? '—',
          currentQty,
          benchmark: p.benchmarkQty,
          shortfall,
          price,
          dayChgPct,
          avgSold,
          plPct,
          cost: price != null ? shortfall * price : null,
        });
      });
      // most profitable buy-back first; rows without a sold price go last
      buyBackOps.sort((a, b) => {
        if (a.plPct == null && b.plPct == null) return 0;
        if (a.plPct == null) return 1;
        if (b.plPct == null) return -1;
        return b.plPct - a.plPct;
      });

      const lastUpload = uploads
        .map((u) => u.date)
        .filter(Boolean)
        .sort()
        .slice(-1)[0];

      // --- admin master-data oversight (across ALL users' portfolios) --------
      // how many users hold each company
      const holdersByCompany = {};
      allPortfolio.forEach((p) => {
        holdersByCompany[p.companyId] = (holdersByCompany[p.companyId] || 0) + 1;
      });
      const inAnyPortfolio = new Set(allPortfolio.map((p) => p.companyId));
      // NSE ticker per company (for searching/identifying the right company)
      const nseExchange = exchanges.find(
        (e) => (e.code || '').toUpperCase() === 'NSE' || (e.name || '').toUpperCase().includes('NSE')
      );
      const nseCodeByCompany = {};
      scripts.forEach((sc) => {
        if (nseExchange && sc.exchangeId === nseExchange.id) {
          nseCodeByCompany[sc.companyId] = sc.code;
        }
      });
      const unindustried = companies
        .filter((c) => inAnyPortfolio.has(c.id) && !c.industryId)
        .map((c) => ({
          companyId: c.id,
          companyName: c.name,
          ISIN: c.ISIN,
          nseCode: nseCodeByCompany[c.id] || null,
          holders: holdersByCompany[c.id] || 0,
        }))
        .sort((a, b) => a.companyName.localeCompare(b.companyName));

      // industry picker options, labelled by full hierarchy path
      const indById = Object.fromEntries(industries.map((i) => [i.id, i]));
      const pathOf = (i) => {
        const parts = [];
        let cur = i;
        let guard = 0;
        while (cur && guard++ < 20) {
          parts.unshift(cur.name);
          cur = cur.parentId ? indById[cur.parentId] : null;
        }
        return parts.join(' / ');
      };
      // depth from the root via the parentId chain (root = 0). There's no
      // stored "level" field, so we derive it from the hierarchy.
      const depthOf = (i) => {
        let d = 0;
        let cur = i;
        let guard = 0;
        while (cur && cur.parentId && guard++ < 20) {
          cur = indById[cur.parentId];
          d += 1;
        }
        return d;
      };
      // Basic Industry = the deepest tier, i.e. a node with no sub-industries
      // (leaf). This is robust to the exact level numbering / un-backfilled
      // levels, so the picker is never accidentally empty.
      void depthOf;
      const hasChildren = new Set(
        industries.filter((i) => i.parentId).map((i) => i.parentId)
      );
      void pathOf;
      const industryOptions = industries
        .filter((i) => !hasChildren.has(i.id))
        .map((i) => ({ value: i.id, label: i.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

      // --- investment allocation by industry tier (Level 1..4) --------------
      // Level 1 = Macro Economic Sector (depth 0) ... Level 4 = Basic Industry
      // (depth 3). Walk each holding's company → its attached industry → up to
      // the ancestor at each depth, summing invested value.
      const chainOf = (industryId) => {
        const chain = [];
        let cur = industryId ? indById[industryId] : null;
        let guard = 0;
        while (cur && guard++ < 20) {
          chain.unshift(cur);
          cur = cur.parentId ? indById[cur.parentId] : null;
        }
        return chain; // chain[d] = node at depth d
      };
      const allocMaps = [{}, {}, {}, {}];
      rows.forEach((r) => {
        const comp = companyById[r.companyId];
        const chain = chainOf(comp?.industryId);
        for (let d = 0; d < 4; d += 1) {
          const key = chain[d] ? chain[d].name : 'Unclassified';
          allocMaps[d][key] = (allocMaps[d][key] || 0) + (r.invested || 0);
        }
      });
      const allocationByLevel = allocMaps.map((m) =>
        Object.entries(m)
          .map(([name, invested]) => ({ name, invested }))
          .sort((a, b) => b.invested - a.invested)
      );

      setData({
        companies: rows.length,
        totalFifo,
        totalSpec: totalSpecInvested,
        totalMarketValue,
        totalPnl: totalMarketValue - totalSpecInvested,
        rows,
        sellOps,
        buyBackOps,
        allocationByLevel,
        admin: {
          companies: companies.length,
          exchanges: exchanges.length,
          brokers: brokerList.length,
          lastUpload: lastUpload || null,
          unindustried,
          industryOptions,
        },
      });
    } catch (e) {
      message.error(`Failed to load dashboard: ${e.message}`);
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function persist(next) {
    if (!currentId) return;
    try {
      const { errors } = await client.models.DashboardLayout.update({
        id: currentId,
        widgets: JSON.stringify(next),
      });
      if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      setDashboards((ds) =>
        ds.map((d) => (d.id === currentId ? { ...d, widgets: next } : d))
      );
    } catch (e) {
      message.error(`Couldn't save layout: ${e.message}`);
    }
  }

  function switchDashboard(id) {
    if (id === currentId) return;
    const d = dashboards.find((x) => x.id === id);
    setEditing(false);
    setCurrentId(id);
    setWidgets(d && d.widgets.length ? d.widgets : []);
  }

  async function addDashboard(name) {
    try {
      const { data: created } = await client.models.DashboardLayout.create({
        name: name.trim() || 'Dashboard',
        widgets: JSON.stringify([]),
      });
      const nd = { id: created.id, name: name.trim() || 'Dashboard', widgets: [] };
      setDashboards((ds) => [...ds, nd].sort((a, b) => a.name.localeCompare(b.name)));
      setCurrentId(created.id);
      setWidgets([]);
      setEditing(true);
    } catch (e) {
      message.error(`Couldn't create dashboard: ${e.message}`);
    }
  }

  async function deleteDashboard(id) {
    if (dashboards.length <= 1) {
      return message.info('Keep at least one dashboard.');
    }
    try {
      await client.models.DashboardLayout.delete({ id });
      const remaining = dashboards.filter((d) => d.id !== id);
      setDashboards(remaining);
      if (currentId === id) switchDashboard(remaining[0].id);
    } catch (e) {
      message.error(`Couldn't delete: ${e.message}`);
    }
  }

  function onLayoutChange(layout) {
    if (!loadedRef.current) return;
    setWidgets((prev) =>
      prev.map((wdg) => {
        const l = layout.find((x) => x.i === wdg.i);
        return l ? { ...wdg, x: l.x, y: l.y, w: l.w, h: l.h } : wdg;
      })
    );
  }

  function addWidget(type) {
    const def = WIDGETS[type];
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const next = [
      ...widgets,
      { i: `w${Date.now()}`, type, x: 0, y: maxY, w: def.size.w, h: def.size.h },
    ];
    setWidgets(next);
    persist(next);
  }

  function removeWidget(i) {
    const next = widgets.filter((w) => w.i !== i);
    setWidgets(next);
    persist(next);
  }

  function doneEditing() {
    setEditing(false);
    persist(widgets);
  }

  // hide any admin-only widgets from non-admins (e.g. if a layout was shared)
  const visibleWidgets = useMemo(
    () => widgets.filter((w) => !WIDGETS[w.type]?.admin || isAdmin),
    [widgets, isAdmin]
  );

  const layout = useMemo(
    () => visibleWidgets.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
    [visibleWidgets]
  );

  const addMenu = {
    items: Object.entries(WIDGETS)
      .filter(([, w]) => !w.admin || isAdmin)
      .map(([type, w]) => ({ key: type, label: w.admin ? `${w.title} (admin)` : w.title })),
    onClick: ({ key }) => addWidget(key),
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Tabs
          type="editable-card"
          activeKey={currentId ?? undefined}
          onChange={switchDashboard}
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              setNewName('');
              setAddOpen(true);
            } else if (action === 'remove') {
              deleteDashboard(targetKey);
            }
          }}
          items={dashboards.map((d) => ({ key: d.id, label: d.name, closable: dashboards.length > 1 }))}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Space>
          {editing && (
            <Dropdown menu={addMenu} trigger={['click']}>
              <Button>+ Add widget</Button>
            </Dropdown>
          )}
          {editing ? (
            <Button type="primary" onClick={doneEditing}>
              Done
            </Button>
          ) : (
            <Button onClick={() => setEditing(true)}>Customize</Button>
          )}
        </Space>
      </div>

      <Modal
        title="New dashboard"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => {
          addDashboard(newName);
          setAddOpen(false);
        }}
        okText="Create"
        okButtonProps={{ disabled: !newName.trim() }}
        destroyOnClose
      >
        <Input
          placeholder="e.g. Portfolio, Trades"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={() => {
            if (newName.trim()) {
              addDashboard(newName);
              setAddOpen(false);
            }
          }}
        />
      </Modal>

      {visibleWidgets.length === 0 ? (
        <Empty description="No widgets. Click Customize → Add widget." />
      ) : (
        <Grid
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={60}
          margin={[16, 16]}
          isDraggable={editing}
          isResizable={editing}
          draggableCancel=".ant-btn,.ant-table,.ant-dropdown"
          onLayoutChange={onLayoutChange}
        >
          {visibleWidgets.map((w) => {
            const def = WIDGETS[w.type];
            return (
              <div key={w.i}>
                <Card
                  size="small"
                  title={def?.title ?? w.type}
                  style={{ height: '100%', overflow: 'auto' }}
                  styles={{ body: { height: 'calc(100% - 38px)', overflow: 'auto' } }}
                  extra={
                    editing ? (
                      <Button
                        size="small"
                        danger
                        type="text"
                        onClick={() => removeWidget(w.i)}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                >
                  {def
                    ? def.render(data, {
                        reload: load,
                        openCompany: (companyId, companyName) =>
                          setCompanyDialog({ companyId, companyName }),
                      })
                    : 'Unknown widget'}
                </Card>
              </div>
            );
          })}
        </Grid>
      )}
      {loading && (
        <Typography.Text type="secondary">Loading…</Typography.Text>
      )}

      {/* company detail dialog (shared with Portfolio) */}
      <Modal
        title={companyDialog ? `Company — ${companyDialog.companyName}` : ''}
        open={!!companyDialog}
        onCancel={() => setCompanyDialog(null)}
        footer={null}
        width="92vw"
        style={{ top: 24, maxWidth: 1400 }}
        styles={{ body: { maxHeight: 'calc(100vh - 140px)', overflow: 'auto' } }}
        destroyOnClose
      >
        {companyDialog && (
          <StockHistory companyId={companyDialog.companyId} onChange={load} />
        )}
      </Modal>
    </div>
  );
}
