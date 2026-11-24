import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import {
  Table,
  Tag,
  Typography,
  Space,
  Statistic,
  Divider,
  Descriptions,
  Segmented,
  Tabs,
  Button,
  Alert,
  Empty,
  message,
} from 'antd';

const client = generateClient();

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const green = '#3f8600';
const red = '#cf1322';
const pnlSpan = (v) =>
  v == null ? '—' : <span style={{ color: v >= 0 ? green : red }}>{money(v)}</span>;

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

// Lazily loads the lot allocations for one trade (which lots it opened/reduced).
// A recovery sell has no allocation — it opens a swing instead — so those are
// passed in and shown instead.
function TradeAllocations({ detailId, lotById, swings = [] }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = client.models.TradeLotAllocation
          ? await listAll(client.models.TradeLotAllocation, { tradeDetailId: { eq: detailId } })
          : [];
        if (active) setRows(data);
      } catch {
        if (active) setRows([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [detailId]);

  const hasAlloc = rows != null && rows.length > 0;
  const hasSwing = swings.length > 0;

  // one unified list: normal lot allocations (REDUCE/OPEN) + recovery swings,
  // so a sell that's part-profit / part-recovery shows both legs.
  const merged = [
    ...(hasAlloc ? rows : []).map((a) => ({
      id: a.id,
      kind: a.kind,
      lotId: a.specificLotId,
      qty: a.quantity,
      extra: null,
    })),
    ...(hasSwing ? swings : []).map((s) => ({
      id: s.id,
      kind: 'RECOVERY',
      lotId: s.specificLotId,
      qty: s.qty,
      extra: s,
    })),
  ];

  if (rows == null && !hasSwing)
    return <Typography.Text type="secondary">Loading…</Typography.Text>;
  if (merged.length === 0)
    return (
      <Typography.Text type="secondary">
        No lot allocations for this trade (intraday).
      </Typography.Text>
    );

  return (
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={merged}
      columns={[
        {
          title: 'Kind',
          dataIndex: 'kind',
          render: (v, a) =>
            v === 'RECOVERY' ? (
              <Tag color={a.lotId ? 'orange' : 'volcano'}>{a.lotId ? 'RECOVERY' : 'SHORT'}</Tag>
            ) : (
              <Tag>{v}</Tag>
            ),
        },
        { title: 'Lot buy date', render: (_, a) => lotById[a.lotId]?.buyDate ?? '—' },
        {
          title: 'Lot buy ₹',
          align: 'right',
          render: (_, a) => money(lotById[a.lotId]?.avgPrice),
        },
        { title: 'Qty', dataIndex: 'qty', align: 'right' },
        {
          title: 'Note',
          render: (_, a) => {
            if (a.kind === 'RECOVERY') {
              const s = a.extra;
              return (
                <span>
                  sold {money(s.sellPrice)} ·{' '}
                  {s.status === 'OPEN' ? (
                    <Tag color="gold">Open</Tag>
                  ) : (
                    <Tag color={s.closeType === 'BUYBACK' ? 'green' : 'default'}>
                      {s.closeType === 'BUYBACK' ? 'Bought back' : 'Closed'}
                    </Tag>
                  )}
                </span>
              );
            }
            return '—';
          },
        },
      ]}
    />
  );
}

/**
 * Full holding history for one stock: every trade over time (buys, sells,
 * intraday), the lots currently held, and any recovery swings.
 */
export default function StockHistory({ companyId, onChange }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null); // { name, ISIN, marketCap, industryPath }
  const [timeline, setTimeline] = useState([]);
  const [intraday, setIntraday] = useState([]); // intraday trade rows
  const [intraLosses, setIntraLosses] = useState([]); // RecoveryEntry rows
  const [specLots, setSpecLots] = useState([]);
  const [fifoLots, setFifoLots] = useState([]);
  const [swings, setSwings] = useState([]);
  const [lotFilter, setLotFilter] = useState('ALL'); // ALL | ACTIVE | SOLD
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState({}); // { lotId: { model, action } } action: RESET | SOLD
  const [proceeding, setProceeding] = useState(false);

  // stage/unstage a lot for a correction (nothing hits the DB until Proceed).
  // action = 'RESET' (balance → bought qty) or 'SOLD' (balance → 0)
  function stageLot(model, id, action) {
    setPending((p) => {
      const c = { ...p };
      if (c[id] && c[id].action === action) delete c[id]; // toggle same action off
      else c[id] = { model, action };
      return c;
    });
  }

  // commit all staged corrections
  async function proceed() {
    const entries = Object.entries(pending);
    if (entries.length === 0) return;
    setProceeding(true);
    try {
      for (const [id, { model, action }] of entries) {
        const arr = model === 'HoldingFIFO' ? fifoLots : specLots;
        const lot = arr.find((l) => l.id === id);
        const newBal = action === 'RESET' ? lot?.quantity ?? 0 : 0;
        const { errors } = await client.models[model].update({
          id,
          balanceQty: newBal,
          soldOut: action === 'SOLD',
        });
        if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      }
      message.success(`Applied ${entries.length} correction(s).`);
      setPending({});
      setRefresh((n) => n + 1); // reload this dialog
      onChange && onChange(); // refresh the parent grid / watcher
    } catch (e) {
      message.error(e.message);
    } finally {
      setProceeding(false);
    }
  }

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    setPending({}); // clear staged revokes when (re)loading
    (async () => {
      setLoading(true);
      try {
        const f = { companyId: { eq: companyId } };
        const [details, books, sw, spec, fifo, coRes, industries, recEnt] = await Promise.all([
          client.models.TradeDetail ? listAll(client.models.TradeDetail, f) : [],
          client.models.TradeBook ? listAll(client.models.TradeBook) : [],
          client.models.RecoverySwing ? listAll(client.models.RecoverySwing, f) : [],
          listAll(client.models.HoldingSpecificLot, f),
          client.models.HoldingFIFO ? listAll(client.models.HoldingFIFO, f) : [],
          client.models.Company.get({ id: companyId }),
          client.models.Industry ? listAll(client.models.Industry) : [],
          client.models.RecoveryEntry ? listAll(client.models.RecoveryEntry, f) : [],
        ]);
        if (!active) return;
        // company profile + industry hierarchy path (root → basic industry)
        const co = coRes?.data;
        if (co) {
          const indById = Object.fromEntries(industries.map((i) => [i.id, i]));
          const path = [];
          let cur = co.industryId ? indById[co.industryId] : null;
          let guard = 0;
          while (cur && guard++ < 20) {
            path.unshift(cur.name);
            cur = cur.parentId ? indById[cur.parentId] : null;
          }
          setProfile({
            name: co.name,
            ISIN: co.ISIN,
            marketCap: co.marketCap,
            industryPath: path,
          });
        }
        const dateByBook = Object.fromEntries(books.map((b) => [b.id, b.tradeDate]));
        const rows = details
          .filter((d) => d.tradeType !== 'INTRADAY') // holding history = delivery only
          .map((d) => ({
            key: d.id,
            date: dateByBook[d.tradeBookId] || '',
            tradeType: d.tradeType,
            side: d.side,
            qty: d.quantity,
            price: d.price ?? d.avgSell,
            pnl: d.realizedPnl,
          }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setTimeline(rows);
        // intraday trades (excluded from the delivery history)
        const intraRows = details
          .filter((d) => d.tradeType === 'INTRADAY')
          .map((d) => ({
            key: d.id,
            date: dateByBook[d.tradeBookId] || '',
            qty: d.quantity,
            avgBuy: d.avgBuy,
            avgSell: d.avgSell,
            pnl: d.realizedPnl,
          }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setIntraday(intraRows);
        setIntraLosses(
          [...recEnt].sort((a, b) =>
            String(b.incurredOn || '').localeCompare(String(a.incurredOn || ''))
          )
        );
        // all lots (held + sold-out), oldest first
        const byDate = (a, b) => String(a.buyDate).localeCompare(String(b.buyDate));
        setSpecLots([...spec].sort(byDate));
        setFifoLots([...fifo].sort(byDate));
        setSwings(sw.sort((a, b) => String(b.sellDate || '').localeCompare(String(a.sellDate || ''))));
      } catch (e) {
        message.error(`Couldn't load history: ${e.message}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId, refresh]);

  const isActive = (l) => (l.balanceQty ?? l.quantity) > 0 || l.recovering;
  const sumBal = (arr) => arr.reduce((s, l) => s + (l.balanceQty ?? l.quantity), 0);
  const heldFifo = sumBal(fifoLots);
  const heldSpec = sumBal(specLots);
  const mismatch = Math.abs(heldFifo - heldSpec) > 1e-6;
  const realized = timeline.reduce((s, r) => s + (r.pnl || 0), 0);

  // preview of balances after the staged corrections: RESET → bought qty,
  // SOLD → 0; others keep their current balance.
  const pendingCount = Object.keys(pending).length;
  const effBal = (l) => {
    const st = pending[l.id];
    if (!st) return l.balanceQty ?? l.quantity;
    return st.action === 'RESET' ? l.quantity ?? 0 : 0;
  };
  const adjFifo = fifoLots.reduce((s, l) => s + effBal(l), 0);
  const adjSpec = specLots.reduce((s, l) => s + effBal(l), 0);
  const adjMismatch = Math.abs(adjFifo - adjSpec) > 1e-6;

  // "Sold" = any lot that's had shares sold (partial or fully), not just sold-out
  const hasSold = (l) => (l.quantity || 0) - (l.balanceQty ?? l.quantity) > 1e-9;
  const passesFilter = (l) =>
    lotFilter === 'ALL' ? true : lotFilter === 'ACTIVE' ? isActive(l) : hasSold(l);
  const shownFifo = fifoLots.filter(passesFilter);
  const shownSpec = specLots.filter(passesFilter);

  const lotById = Object.fromEntries(specLots.map((l) => [l.id, l]));
  // swings grouped by the sell TradeDetail that opened them
  const swingsByDetail = {};
  swings.forEach((s) => {
    if (s.openTradeDetailId)
      (swingsByDetail[s.openTradeDetailId] = swingsByDetail[s.openTradeDetailId] || []).push(s);
  });

  const lotCols = (modelName) => [
    { title: 'Buy date', dataIndex: 'buyDate', width: 100 },
    { title: 'Bought', dataIndex: 'quantity', align: 'right', render: (v) => v?.toLocaleString('en-IN') },
    {
      title: 'Balance',
      align: 'right',
      render: (_, l) => (l.balanceQty ?? l.quantity)?.toLocaleString('en-IN'),
    },
    { title: 'Buy ₹', dataIndex: 'avgPrice', align: 'right', render: money },
    {
      title: 'Status',
      key: 'status',
      width: 96,
      render: (_, l) => {
        const bal = l.balanceQty ?? l.quantity;
        if (l.recovering) return <Tag color="orange">Recovering</Tag>;
        if (bal <= 1e-9) return <Tag>Sold out</Tag>;
        if (bal < (l.quantity || 0)) return <Tag color="blue">Part-sold</Tag>;
        return <Tag color="green">Held</Tag>;
      },
    },
    {
      title: 'Correct',
      key: 'correct',
      width: 190,
      render: (_, l) => {
        const st = pending[l.id];
        const bal = l.balanceQty ?? l.quantity;
        const full = bal >= (l.quantity || 0) - 1e-9;
        const sold = bal <= 1e-9;
        if (st) {
          return (
            <Space size={4}>
              <Tag color="gold">
                {st.action === 'RESET'
                  ? `→ ${l.quantity?.toLocaleString('en-IN')}`
                  : '→ sold (0)'}
              </Tag>
              <Button size="small" onClick={() => stageLot(modelName, l.id, st.action)}>
                Undo
              </Button>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Button
              size="small"
              type="link"
              disabled={full}
              onClick={() => stageLot(modelName, l.id, 'RESET')}
            >
              Revoke
            </Button>
            <Button
              size="small"
              type="link"
              danger
              disabled={sold}
              onClick={() => stageLot(modelName, l.id, 'SOLD')}
            >
              Mark sold
            </Button>
          </Space>
        );
      },
    },
  ];

  const typeTag = (r) => {
    if (r.tradeType === 'INTRADAY') return <Tag color="blue">Intraday</Tag>;
    return r.side === 'BUY' ? <Tag color="geekblue">Buy</Tag> : <Tag color="gold">Sell</Tag>;
  };

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      {profile && (
        <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
          <Descriptions.Item label="Company">{profile.name}</Descriptions.Item>
          <Descriptions.Item label="ISIN">{profile.ISIN || '—'}</Descriptions.Item>
          <Descriptions.Item label="Market cap">
            {profile.marketCap == null ? '—' : `₹${Number(profile.marketCap).toLocaleString('en-IN')}`}
          </Descriptions.Item>
          <Descriptions.Item label="Industry">
            {profile.industryPath.length ? (
              profile.industryPath.map((n, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: '#bbb' }}> › </span>}
                  {i === profile.industryPath.length - 1 ? <strong>{n}</strong> : n}
                </span>
              ))
            ) : (
              <span style={{ color: '#cf1322' }}>No industry attached</span>
            )}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Space size="large" wrap>
        <Statistic title="Held (FIFO)" value={heldFifo.toLocaleString('en-IN')} />
        <Statistic
          title="Held (Specific)"
          value={heldSpec.toLocaleString('en-IN')}
          valueStyle={mismatch ? { color: red } : undefined}
        />
        {mismatch && (
          <Statistic
            title="Mismatch (Δ)"
            value={(heldFifo - heldSpec).toLocaleString('en-IN')}
            valueStyle={{ color: red }}
          />
        )}
        <Statistic title="Trades" value={timeline.length} />
        <Statistic
          title="Realized P&L (all time)"
          value={money(realized)}
          valueStyle={{ color: realized >= 0 ? green : red }}
        />
      </Space>

      <Tabs
        items={[
          {
            key: 'delivery',
            label: `Delivery trades (${timeline.length})`,
            children: (
              <>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Click a trade to see the lots it opened or reduced.
                </Typography.Text>
                <Table
                  rowKey="key"
                  size="small"
                  loading={loading}
                  style={{ marginTop: 8 }}
                  dataSource={timeline}
                  pagination={{ pageSize: 12, hideOnSinglePage: true }}
                  locale={{ emptyText: 'No delivery trades for this stock.' }}
                  expandable={{
                    expandedRowRender: (r) => (
                      <TradeAllocations
                        detailId={r.key}
                        lotById={lotById}
                        swings={swingsByDetail[r.key] || []}
                      />
                    ),
                  }}
                  columns={[
                    { title: 'Date', dataIndex: 'date', width: 120, defaultSortOrder: 'descend',
                      sorter: (a, b) => String(a.date).localeCompare(String(b.date)) },
                    { title: 'Action', key: 'type', width: 110, render: (_, r) => typeTag(r) },
                    { title: 'Qty', dataIndex: 'qty', align: 'right', render: (v) => v?.toLocaleString('en-IN') },
                    { title: 'Price', dataIndex: 'price', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                    { title: 'Realized P&L', dataIndex: 'pnl', align: 'right', render: pnlSpan },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'intraday',
            label: `Intraday (${intraday.length})`,
            children: (
              <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
                <div>
                  <Typography.Text strong>Intraday trades</Typography.Text>
                  <Table
                    rowKey="key"
                    size="small"
                    style={{ marginTop: 6 }}
                    dataSource={intraday}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    locale={{ emptyText: 'No intraday trades.' }}
                    columns={[
                      { title: 'Date', dataIndex: 'date', width: 120 },
                      { title: 'Qty', dataIndex: 'qty', align: 'right', render: (v) => v?.toLocaleString('en-IN') },
                      { title: 'Avg buy', dataIndex: 'avgBuy', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                      { title: 'Avg sell', dataIndex: 'avgSell', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                      { title: 'P&L', dataIndex: 'pnl', align: 'right', render: pnlSpan },
                    ]}
                  />
                </div>
                <div>
                  <Typography.Text strong>Intraday losses to recover</Typography.Text>
                  <Table
                    rowKey="id"
                    size="small"
                    style={{ marginTop: 6 }}
                    dataSource={intraLosses}
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
                    locale={{ emptyText: 'No outstanding intraday losses.' }}
                    columns={[
                      { title: 'Incurred on', dataIndex: 'incurredOn', render: (v) => v || '—' },
                      { title: 'Outstanding ₹', dataIndex: 'amount', align: 'right', render: (v) => <span style={{ color: red }}>{money(v)}</span> },
                      { title: 'Note', dataIndex: 'note', render: (v) => v || '—' },
                    ]}
                  />
                </div>
              </Space>
            ),
          },
          {
            key: 'holdings',
            label: 'Holdings (lots)',
            children: (
              <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
                {pendingCount > 0 && (
                  <Alert
                    type={adjMismatch ? 'warning' : 'success'}
                    showIcon
                    message={`${pendingCount} lot(s) staged for correction — nothing has changed yet`}
                    description={
                      <Space size="large" wrap>
                        <span>Adjusted FIFO: <strong>{adjFifo.toLocaleString('en-IN')}</strong></span>
                        <span>Adjusted Specific: <strong>{adjSpec.toLocaleString('en-IN')}</strong></span>
                        <span style={{ color: adjMismatch ? red : green, fontWeight: 600 }}>
                          {adjMismatch
                            ? `Δ ${(adjFifo - adjSpec).toLocaleString('en-IN')} — still mismatched`
                            : 'Will match ✓'}
                        </span>
                        <Button size="small" onClick={() => setPending({})} disabled={proceeding}>Clear</Button>
                        <Button size="small" type="primary" loading={proceeding} onClick={proceed}>
                          Proceed — apply {pendingCount}
                        </Button>
                      </Space>
                    }
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography.Text strong>Lots — Specific vs FIFO</Typography.Text>
                  <Segmented
                    size="small"
                    value={lotFilter}
                    onChange={setLotFilter}
                    options={[
                      { label: 'All', value: 'ALL' },
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'Sold', value: 'SOLD' },
                    ]}
                  />
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <Typography.Text type="secondary">
                      Specific lots — balance {heldSpec.toLocaleString('en-IN')}
                    </Typography.Text>
                    <Table
                      rowKey="id"
                      size="small"
                      style={{ marginTop: 6 }}
                      dataSource={shownSpec}
                      pagination={{ pageSize: 10, hideOnSinglePage: true }}
                      locale={{ emptyText: 'No specific lots.' }}
                      columns={lotCols('HoldingSpecificLot')}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <Typography.Text type="secondary">
                      FIFO lots — balance {heldFifo.toLocaleString('en-IN')}
                      {mismatch && <span style={{ color: red }}> (≠ specific)</span>}
                    </Typography.Text>
                    <Table
                      rowKey="id"
                      size="small"
                      style={{ marginTop: 6 }}
                      dataSource={shownFifo}
                      pagination={{ pageSize: 10, hideOnSinglePage: true }}
                      locale={{ emptyText: 'No FIFO lots.' }}
                      columns={lotCols('HoldingFIFO')}
                    />
                  </div>
                </div>
              </Space>
            ),
          },
          {
            key: 'recovery',
            label: `Recovery (${swings.length})`,
            children:
              swings.length > 0 ? (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={swings}
                  pagination={{ pageSize: 8, hideOnSinglePage: true }}
                  columns={[
                    {
                      title: 'Type',
                      key: 'ty',
                      width: 100,
                      render: (_, s) =>
                        s.specificLotId ? (
                          <Tag color="orange">Recovery</Tag>
                        ) : (
                          <Tag color="volcano">Short</Tag>
                        ),
                    },
                    { title: 'Sold on', dataIndex: 'sellDate', width: 120, render: (v) => v || '—' },
                    { title: 'Qty', dataIndex: 'qty', align: 'right' },
                    { title: 'Sell ₹', dataIndex: 'sellPrice', align: 'right', render: money },
                    { title: 'Buy-back ₹', dataIndex: 'buyBackPrice', align: 'right', render: (v) => (v == null ? '—' : money(v)) },
                    {
                      title: 'Status',
                      key: 'st',
                      render: (_, s) =>
                        s.status === 'OPEN' ? (
                          <Tag color="gold">Open</Tag>
                        ) : (
                          <Tag color={s.closeType === 'BUYBACK' ? 'green' : 'default'}>
                            {s.closeType === 'BUYBACK' ? 'Bought back' : 'Closed'}
                          </Tag>
                        ),
                    },
                    { title: 'Profit', dataIndex: 'profit', align: 'right', render: pnlSpan },
                  ]}
                />
              ) : (
                <Empty description="No recovery swings for this stock." />
              ),
          },
        ]}
      />
    </Space>
  );
}
