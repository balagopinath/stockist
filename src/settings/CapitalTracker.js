import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import dayjs from 'dayjs';
import {
  Typography,
  Space,
  Table,
  Button,
  Card,
  Statistic,
  Modal,
  InputNumber,
  Input,
  Tag,
  Alert,
  message,
  Row,
  Col,
} from 'antd';

const client = generateClient();

const money = (v) =>
  v == null || Number.isNaN(v)
    ? '—'
    : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (mo) => (mo ? dayjs(`${mo}-01`).format('MMMM YYYY') : '—');

// inclusive list of 'YYYY-MM' from start to end
function monthsBetween(start, end) {
  const res = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard < 600) {
    res.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }
  return res;
}

async function listAll(model) {
  let all = [];
  let nextToken = null;
  do {
    const { data, nextToken: nt, errors } = await model.list({ limit: 1000, nextToken });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    all = all.concat(data);
    nextToken = nt;
  } while (nextToken);
  return all;
}

export default function CapitalTracker() {
  const [config, setConfig] = useState(null);
  const [months, setMonths] = useState([]); // CapitalMonth rows
  const [books, setBooks] = useState([]); // TradeBook rows
  const [funds, setFunds] = useState([]); // FundEntry rows
  const [loading, setLoading] = useState(true);
  const [deployed, setDeployed] = useState(true);

  // setup / settings dialog
  const [setupOpen, setSetupOpen] = useState(false);
  const [fCapital, setFCapital] = useState(100000);
  const [fRate, setFRate] = useState(2);
  const [fStart, setFStart] = useState(thisMonth());
  const [savingCfg, setSavingCfg] = useState(false);

  // per-month edit dialog (trading P&L override + note only — cash comes from Funds)
  const [editRow, setEditRow] = useState(null);
  const [eOverride, setEOverride] = useState(null);
  const [eNote, setENote] = useState('');
  const [savingRow, setSavingRow] = useState(false);

  async function load() {
    setLoading(true);
    try {
      if (!client.models.CapitalConfig || !client.models.CapitalMonth) {
        setDeployed(false);
        return;
      }
      const [cfgs, ms, bks, fes] = await Promise.all([
        listAll(client.models.CapitalConfig),
        listAll(client.models.CapitalMonth),
        listAll(client.models.TradeBook),
        client.models.FundEntry ? listAll(client.models.FundEntry) : [],
      ]);
      const cfg = cfgs[0] || null;
      setConfig(cfg);
      setMonths(ms);
      setBooks(bks);
      setFunds(fes);
      if (cfg) {
        setFCapital(cfg.initialCapital);
        setFRate(cfg.monthlyRatePct);
        setFStart(cfg.startMonth);
      }
    } catch (e) {
      message.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // net realized P&L per month from the tradebooks (realized − charges)
  const autoPnlByMonth = useMemo(() => {
    const m = {};
    books.forEach((b) => {
      const mo = (b.tradeDate || '').slice(0, 7);
      if (!mo) return;
      m[mo] = (m[mo] || 0) + (b.realizedPnl || 0) - (b.charges || 0);
    });
    return m;
  }, [books]);

  // deposits / withdrawals per month, straight from the Funds ledger.
  // (Withdrawals are stored negative in FundEntry.)
  const fundsByMonth = useMemo(() => {
    const m = {};
    funds.forEach((f) => {
      if (f.type !== 'DEPOSIT' && f.type !== 'WITHDRAWAL') return;
      const mo = (f.date || '').slice(0, 7);
      if (!mo) return;
      const g = (m[mo] = m[mo] || { deposit: 0, withdrawal: 0 });
      if (f.type === 'DEPOSIT') g.deposit += f.amount || 0;
      else g.withdrawal += Math.abs(f.amount || 0);
    });
    return m;
  }, [funds]);

  const monthByKey = useMemo(
    () => Object.fromEntries(months.map((r) => [r.month, r])),
    [months]
  );

  // build the running chain start → current month
  const rows = useMemo(() => {
    if (!config) return [];
    const rate = (config.monthlyRatePct || 0) / 100;
    const end = thisMonth();
    const keys = monthsBetween(
      config.startMonth,
      end < config.startMonth ? config.startMonth : end
    );
    let opening = config.initialCapital || 0;
    return keys.map((mo) => {
      const rec = monthByKey[mo];
      const fm = fundsByMonth[mo] || { deposit: 0, withdrawal: 0 };
      const interest = opening * rate;
      const autoPnl = autoPnlByMonth[mo];
      const tradePnl = rec && rec.profitOverride != null ? rec.profitOverride : autoPnl;
      const overridden = !!(rec && rec.profitOverride != null);
      const deposit = fm.deposit;
      const withdrawal = fm.withdrawal;
      const closing = opening * (1 + rate) + deposit - withdrawal;
      const row = {
        key: mo,
        month: mo,
        opening,
        interest,
        rate,
        tradePnl,
        overridden,
        deposit,
        withdrawal,
        closing,
        change: closing - opening, // = interest + deposit − withdrawal
        note: rec?.note || '',
      };
      opening = closing;
      return row;
    });
  }, [config, monthByKey, autoPnlByMonth, fundsByMonth]);

  const current = rows.length ? rows[rows.length - 1].closing : config?.initialCapital || 0;
  const totalWithdrawn = rows.reduce((s, r) => s + (r.withdrawal || 0), 0);
  const totalDeposited = rows.reduce((s, r) => s + (r.deposit || 0), 0);
  const totalInterest = rows.reduce((s, r) => s + (r.interest || 0), 0);
  const totalTradePnl = rows.reduce((s, r) => s + (r.tradePnl || 0), 0);

  async function saveConfig() {
    if (!(fCapital > 0)) return message.error('Enter a starting capital.');
    if (!(fRate > 0)) return message.error('Enter a monthly rate.');
    if (!/^\d{4}-\d{2}$/.test(fStart)) return message.error('Pick a valid start month.');
    setSavingCfg(true);
    try {
      if (config) {
        const { errors } = await client.models.CapitalConfig.update({
          id: config.id,
          initialCapital: fCapital,
          monthlyRatePct: fRate,
          startMonth: fStart,
        });
        if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      } else {
        const { errors } = await client.models.CapitalConfig.create({
          initialCapital: fCapital,
          monthlyRatePct: fRate,
          startMonth: fStart,
        });
        if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      }
      message.success('Saved');
      setSetupOpen(false);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setSavingCfg(false);
    }
  }

  function openEdit(row) {
    setEditRow(row);
    setEOverride(row.overridden ? row.tradePnl : null);
    setENote(row.note || '');
  }

  async function saveRow() {
    setSavingRow(true);
    try {
      const rec = monthByKey[editRow.month];
      const payload = {
        month: editRow.month,
        profitOverride: eOverride,
        note: eNote || null,
      };
      if (rec) {
        const { errors } = await client.models.CapitalMonth.update({ id: rec.id, ...payload });
        if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      } else {
        const { errors } = await client.models.CapitalMonth.create(payload);
        if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      }
      message.success('Saved');
      setEditRow(null);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setSavingRow(false);
    }
  }

  const ratePct = config ? config.monthlyRatePct : fRate;

  const columns = [
    {
      title: 'Month',
      dataIndex: 'month',
      render: (mo) => monthLabel(mo),
    },
    {
      title: 'Opening',
      dataIndex: 'opening',
      align: 'right',
      render: (v) => money(v),
    },
    {
      title: `Interest (${ratePct}%)`,
      dataIndex: 'interest',
      align: 'right',
      render: (v) => <span style={{ color: '#389e0d' }}>{money(v)}</span>,
    },
    {
      title: 'Trading P&L',
      dataIndex: 'tradePnl',
      align: 'right',
      render: (v, r) =>
        v == null ? (
          '—'
        ) : (
          <Space size={4}>
            <span style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>{money(v)}</span>
            {r.overridden && <Tag color="gold">manual</Tag>}
          </Space>
        ),
    },
    {
      title: 'Deposited',
      dataIndex: 'deposit',
      align: 'right',
      render: (v) => (v ? <span style={{ color: '#389e0d' }}>+{money(v)}</span> : '—'),
    },
    {
      title: 'Withdrawn',
      dataIndex: 'withdrawal',
      align: 'right',
      render: (v) => (v ? <span style={{ color: '#cf1322' }}>−{money(v)}</span> : '—'),
    },
    {
      title: 'Closing',
      dataIndex: 'closing',
      align: 'right',
      render: (v) => <strong>{money(v)}</strong>,
    },
    {
      title: 'Change',
      dataIndex: 'change',
      align: 'right',
      render: (v) => {
        const up = v >= 0;
        return (
          <span style={{ color: up ? '#389e0d' : '#cf1322' }}>
            {up ? '▲' : '▼'} {money(Math.abs(v))}
          </span>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => openEdit(r)}>
          Edit
        </Button>
      ),
    },
  ];

  if (!deployed) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Capital tracker not deployed yet"
        description='Run "npm run sandbox:once" to create the CapitalConfig and CapitalMonth tables, then reload.'
      />
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Capital Tracker
          </Typography.Title>
          <Typography.Text type="secondary">
            Your capital earns a fixed {ratePct || 2}% each month. Deposits and
            withdrawals come from the Funds page — withdraw more than the interest
            and capital shrinks; less (or deposit) and it grows.
          </Typography.Text>
        </div>
        <Button onClick={() => setSetupOpen(true)}>
          {config ? 'Edit settings' : 'Set up'}
        </Button>
      </div>

      {!config ? (
        <Alert
          type="info"
          showIcon
          message="Set up your capital tracker"
          description="Enter your starting capital, the monthly rate (e.g. 2%), and the month you started. Each month afterwards is tracked automatically, pulling deposits/withdrawals from your Funds ledger."
          action={
            <Button type="primary" onClick={() => setSetupOpen(true)}>
              Set up
            </Button>
          }
        />
      ) : (
        <>
          <Card size="small">
            <Row gutter={[16, 16]}>
              <Col xs={12} md={8} lg={4}>
                <Statistic title="Current capital" value={money(current)} />
              </Col>
              <Col xs={12} md={8} lg={4}>
                <Statistic
                  title="Deposited"
                  value={money(totalDeposited)}
                  valueStyle={{ color: '#389e0d' }}
                />
              </Col>
              <Col xs={12} md={8} lg={4}>
                <Statistic
                  title="Withdrawn"
                  value={money(totalWithdrawn)}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col xs={12} md={8} lg={4}>
                <Statistic
                  title="Interest credited"
                  value={money(totalInterest)}
                  valueStyle={{ color: '#389e0d' }}
                />
              </Col>
              <Col xs={12} md={8} lg={4}>
                <Statistic
                  title="Trading P&L (net)"
                  value={money(totalTradePnl)}
                  valueStyle={{ color: totalTradePnl >= 0 ? '#389e0d' : '#cf1322' }}
                />
              </Col>
            </Row>
          </Card>

          <Table
            rowKey="key"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 24, hideOnSinglePage: true }}
            locale={{ emptyText: 'No months to show yet.' }}
          />

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Closing = Opening × (1 + {ratePct}%) + Deposited − Withdrawn. Deposits and
            withdrawals are read from the Funds page. Trading P&L is pulled from your
            daily trades (net of charges) for reference — it doesn't change the capital
            directly.
          </Typography.Text>
        </>
      )}

      {/* Setup / settings */}
      <Modal
        title={config ? 'Capital settings' : 'Set up capital tracker'}
        open={setupOpen}
        onCancel={() => setSetupOpen(false)}
        onOk={saveConfig}
        okText="Save"
        okButtonProps={{ loading: savingCfg }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text>Starting capital</Typography.Text>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
              value={fCapital}
              onChange={setFCapital}
              addonBefore="₹"
            />
          </div>
          <div>
            <Typography.Text>Monthly rate</Typography.Text>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              step={0.25}
              value={fRate}
              onChange={setFRate}
              addonAfter="% / month"
            />
          </div>
          <div>
            <Typography.Text>Start month</Typography.Text>
            <Input
              style={{ width: '100%' }}
              placeholder="YYYY-MM"
              value={fStart}
              onChange={(e) => setFStart(e.target.value)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Format: YYYY-MM, e.g. {thisMonth()}
            </Typography.Text>
          </div>
        </Space>
      </Modal>

      {/* Per-month edit — trading P&L override + note */}
      <Modal
        title={editRow ? `${monthLabel(editRow.month)}` : ''}
        open={!!editRow}
        onCancel={() => setEditRow(null)}
        onOk={saveRow}
        okText="Save"
        okButtonProps={{ loading: savingRow }}
        destroyOnClose
      >
        {editRow && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Typography.Text type="secondary">
              Opening {money(editRow.opening)} · interest {money(editRow.interest)} ·
              deposited {money(editRow.deposit)} · withdrawn {money(editRow.withdrawal)}.
              Deposits and withdrawals are managed on the Funds page.
            </Typography.Text>
            <div>
              <Typography.Text>Trading P&L override (optional)</Typography.Text>
              <InputNumber
                style={{ width: '100%' }}
                value={eOverride}
                onChange={setEOverride}
                addonBefore="₹"
                placeholder={
                  autoPnlByMonth[editRow.month] != null
                    ? `Auto: ${money(autoPnlByMonth[editRow.month])}`
                    : 'No trades recorded'
                }
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Leave blank to use the figure from your daily trades.
              </Typography.Text>
            </div>
            <div>
              <Typography.Text>Note</Typography.Text>
              <Input value={eNote} onChange={(e) => setENote(e.target.value)} />
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
