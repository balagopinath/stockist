import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Space,
  Button,
  Upload,
  Table,
  Tag,
  Card,
  Statistic,
  Switch,
  Alert,
  Typography,
  message,
} from 'antd';

const client = generateClient();

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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

const QTY_TOL = 1e-6;
const AMT_TOL = 1; // ₹1 rounding tolerance on invested

export default function ReconcileHoldings() {
  const [companies, setCompanies] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [fifoLots, setFifoLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [onlyDiffs, setOnlyDiffs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState([]);
  const [diffs, setDiffs] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const active = { soldOut: { ne: true } };
      const [co, sc, f, rr, rd] = await Promise.all([
        listAll(client.models.Company),
        listAll(client.models.Script),
        listAll(client.models.HoldingFIFO, active),
        client.models.ReconRun ? listAll(client.models.ReconRun) : [],
        client.models.ReconDiff ? listAll(client.models.ReconDiff) : [],
      ]);
      setCompanies(co);
      setScripts(sc);
      setFifoLots(f);
      setRuns(
        [...rr].sort((a, b) =>
          String(b.runAt || '').localeCompare(String(a.runAt || ''))
        )
      );
      setDiffs(rd);
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
  const symbolToCompany = useMemo(() => {
    const m = {};
    scripts.forEach((s) => {
      if (s.code) m[s.code.toUpperCase()] = s.companyId;
    });
    return m;
  }, [scripts]);

  // app holdings per company (FIFO balance)
  const appByCompany = useMemo(() => {
    const m = {};
    fifoLots.forEach((l) => {
      const bal = l.balanceQty ?? l.quantity;
      if (bal <= 0) return;
      const g = (m[l.companyId] = m[l.companyId] || { qty: 0, invested: 0 });
      g.qty += bal;
      g.invested += bal * l.avgPrice;
    });
    return m;
  }, [fifoLots]);

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const zRows = data
          .map((raw) => ({
            symbol: pick(raw, 'Instrument'),
            qty: num(pick(raw, 'Qty.')),
            invested: num(pick(raw, 'Invested')),
            avgCost: num(pick(raw, 'Avg. cost')),
          }))
          .filter((r) => r.symbol);

        const seen = new Set();
        const out = zRows.map((z) => {
          const cid = symbolToCompany[z.symbol.toUpperCase()];
          if (cid) seen.add(cid);
          const app = cid ? appByCompany[cid] : null;
          const appQty = app?.qty ?? 0;
          const appInvested = app?.invested ?? 0;
          return {
            key: z.symbol,
            instrument: z.symbol,
            company: cid ? companyById[cid]?.name ?? '—' : null,
            mapped: !!cid,
            appQty,
            zQty: z.qty,
            qtyDiff: appQty - z.qty,
            appInvested,
            zInvested: z.invested,
            investedDiff: appInvested - z.invested,
          };
        });

        // app holdings not present in the Zerodha file
        Object.keys(appByCompany).forEach((cid) => {
          if (seen.has(cid)) return;
          const app = appByCompany[cid];
          out.push({
            key: `app-${cid}`,
            instrument: companyById[cid]?.name ?? '—',
            company: companyById[cid]?.name ?? '—',
            mapped: true,
            appQty: app.qty,
            zQty: 0,
            qtyDiff: app.qty,
            appInvested: app.invested,
            zInvested: 0,
            investedDiff: app.invested,
            onlyInApp: true,
          });
        });

        out.sort((a, b) => a.instrument.localeCompare(b.instrument));
        setRows(out);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
  }

  function statusOf(r) {
    if (!r.mapped) return { label: 'No mapping', color: 'default' };
    if (r.zQty === 0 && r.appQty > 0) return { label: 'Only in app', color: 'orange' };
    if (r.appQty === 0 && r.zQty > 0) return { label: 'Only in Zerodha', color: 'orange' };
    const qtyOk = Math.abs(r.qtyDiff) < QTY_TOL;
    const amtOk = Math.abs(r.investedDiff) < AMT_TOL;
    if (qtyOk && amtOk) return { label: 'OK', color: 'green' };
    if (!qtyOk) return { label: 'Qty differs', color: 'red' };
    return { label: 'Price differs', color: 'gold' };
  }

  const withStatus = rows.map((r) => ({ ...r, status: statusOf(r) }));
  const shown = onlyDiffs
    ? withStatus.filter((r) => r.status.label !== 'OK')
    : withStatus;

  const okCount = withStatus.filter((r) => r.status.label === 'OK').length;
  const diffCount = withStatus.length - okCount;

  async function saveRun() {
    setSaving(true);
    try {
      const { data: run } = await client.models.ReconRun.create({
        runAt: new Date().toISOString(),
        source: 'Zerodha holdings',
        comparedCount: withStatus.length,
        diffCount,
      });
      // store only the differences
      const toStore = withStatus.filter((r) => r.status.label !== 'OK');
      for (const r of toStore) {
        await client.models.ReconDiff.create({
          reconRunId: run.id,
          symbol: r.instrument,
          appQty: r.appQty,
          brokerQty: r.zQty,
          qtyDiff: r.qtyDiff,
          appInvested: r.appInvested,
          brokerInvested: r.zInvested,
          investedDiff: r.investedDiff,
          status: r.status.label,
        });
      }
      message.success('Reconciliation saved');
      load();
    } catch (e) {
      message.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const diffsByRun = useMemo(() => {
    const m = {};
    diffs.forEach((d) => (m[d.reconRunId] = m[d.reconRunId] || []).push(d));
    return m;
  }, [diffs]);

  const diffCell = (v, fmt = (x) => x) =>
    Math.abs(v) < QTY_TOL ? (
      '—'
    ) : (
      <span style={{ color: v > 0 ? '#3f8600' : '#cf1322' }}>{fmt(v)}</span>
    );

  const columns = [
    { title: 'Instrument', dataIndex: 'instrument' },
    { title: 'App qty', dataIndex: 'appQty', align: 'right', render: (v) => v?.toLocaleString('en-IN') },
    { title: 'Zerodha qty', dataIndex: 'zQty', align: 'right', render: (v) => v?.toLocaleString('en-IN') },
    {
      title: 'Δ qty',
      dataIndex: 'qtyDiff',
      align: 'right',
      render: (v) => diffCell(v, (x) => x.toLocaleString('en-IN')),
    },
    { title: 'App invested', dataIndex: 'appInvested', align: 'right', render: money },
    { title: 'Zerodha invested', dataIndex: 'zInvested', align: 'right', render: money },
    {
      title: 'Δ invested',
      dataIndex: 'investedDiff',
      align: 'right',
      render: (v) => (Math.abs(v) < AMT_TOL ? '—' : diffCell(v, money)),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => <Tag color={r.status.color}>{r.status.label}</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Upload accept=".csv,.CSV" showUploadList={false} beforeUpload={handleFile}>
          <Button type="primary">Choose Zerodha holdings CSV</Button>
        </Upload>
        {rows.length > 0 && (
          <span style={{ marginLeft: 'auto' }}>
            <Switch checked={onlyDiffs} onChange={setOnlyDiffs} size="small" /> Only differences
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <Card size="small">
          <Space size="large" wrap>
            <Statistic title="Compared" value={withStatus.length} />
            <Statistic title="Matched" value={okCount} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="Differences" value={diffCount} valueStyle={{ color: diffCount ? '#cf1322' : undefined }} />
            <Button type="primary" loading={saving} onClick={saveRun}>
              Save reconciliation
            </Button>
          </Space>
        </Card>
      )}

      {rows.length === 0 && !loading && (
        <Alert
          type="info"
          showIcon
          message="Upload your Zerodha holdings export to compare against the app's holdings."
          description="Read-only — nothing is changed. It matches by symbol → company (via Scripts) and compares quantity and invested amount."
        />
      )}

      {rows.length > 0 && (
        <Table
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={shown}
          pagination={{ pageSize: 25, hideOnSinglePage: true }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: onlyDiffs ? 'No differences 🎉' : 'No rows.' }}
        />
      )}

      <Typography.Text strong>Reconciliation history</Typography.Text>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={runs}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        columns={[
          {
            title: 'Run at',
            dataIndex: 'runAt',
            render: (v) => (v ? new Date(v).toLocaleString('en-IN') : '—'),
          },
          { title: 'Source', dataIndex: 'source' },
          { title: 'Compared', dataIndex: 'comparedCount', align: 'right' },
          {
            title: 'Differences',
            dataIndex: 'diffCount',
            align: 'right',
            render: (v) => (
              <span style={{ color: v ? '#cf1322' : '#3f8600' }}>{v}</span>
            ),
          },
        ]}
        expandable={{
          rowExpandable: (r) => (diffsByRun[r.id] || []).length > 0,
          expandedRowRender: (r) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={diffsByRun[r.id] || []}
              columns={[
                { title: 'Instrument', dataIndex: 'symbol' },
                { title: 'App qty', dataIndex: 'appQty', align: 'right' },
                { title: 'Broker qty', dataIndex: 'brokerQty', align: 'right' },
                {
                  title: 'Δ qty',
                  dataIndex: 'qtyDiff',
                  align: 'right',
                  render: (v) => (v ? v.toLocaleString('en-IN') : '—'),
                },
                { title: 'App invested', dataIndex: 'appInvested', align: 'right', render: money },
                { title: 'Broker invested', dataIndex: 'brokerInvested', align: 'right', render: money },
                {
                  title: 'Δ invested',
                  dataIndex: 'investedDiff',
                  align: 'right',
                  render: (v) => (v ? money(v) : '—'),
                },
                { title: 'Status', dataIndex: 'status' },
              ]}
            />
          ),
        }}
        locale={{ emptyText: 'No saved reconciliations yet.' }}
      />
    </Space>
  );
}
