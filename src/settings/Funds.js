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
  DatePicker,
  Input,
  Segmented,
  Popconfirm,
  Tag,
  message,
} from 'antd';

const client = generateClient();

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

export default function Funds() {
  const [entries, setEntries] = useState([]);
  const [holdingsValue, setHoldingsValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // add-entry dialog
  const [addOpen, setAddOpen] = useState(false);
  const [kind, setKind] = useState('DEPOSIT');
  const [amount, setAmount] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // opening balance dialog
  const [obOpen, setObOpen] = useState(false);
  const [obAmount, setObAmount] = useState(null);
  const [obDate, setObDate] = useState(dayjs());
  const [obSaving, setObSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      if (!client.models.FundEntry) {
        message.error('Funds model not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      const active = { soldOut: { ne: true } };
      const [fe, lots, quotes] = await Promise.all([
        listAll(client.models.FundEntry),
        listAll(client.models.HoldingFIFO, active),
        client.models.CurrentQuote ? listAll(client.models.CurrentQuote) : [],
      ]);
      setEntries(fe);
      // holdings market value (balance qty × current price)
      const priceByCompany = {};
      quotes.forEach((q) => (priceByCompany[q.companyId] = q.close ?? q.ltp ?? null));
      const mv = lots.reduce((s, l) => {
        const bal = l.balanceQty ?? l.quantity;
        const p = priceByCompany[l.companyId];
        return s + (p != null ? bal * p : 0);
      }, 0);
      setHoldingsValue(mv);
    } catch (e) {
      message.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openingEntry = useMemo(
    () => entries.find((e) => e.type === 'OPENING') || null,
    [entries]
  );

  const totals = useMemo(() => {
    let opening = 0;
    let deposit = 0;
    let withdrawal = 0;
    let trading = 0;
    entries.forEach((e) => {
      if (e.type === 'OPENING') opening += e.amount;
      else if (e.type === 'DEPOSIT') deposit += e.amount;
      else if (e.type === 'WITHDRAWAL') withdrawal += e.amount;
      else if (e.type === 'TRADING') trading += e.amount;
    });
    const netCapital = opening + deposit + withdrawal; // withdrawal stored negative
    const cash = opening + deposit + withdrawal + trading;
    const totalValue = cash + holdingsValue;
    const returnPct = netCapital > 0 ? ((totalValue - netCapital) / netCapital) * 100 : null;
    return { opening, deposit, withdrawal, trading, netCapital, cash, totalValue, returnPct };
  }, [entries, holdingsValue]);

  function openAdd() {
    setKind('DEPOSIT');
    setAmount(null);
    setDate(dayjs());
    setNote('');
    setAddOpen(true);
  }

  async function saveEntry() {
    if (!(amount > 0)) return message.error('Enter an amount.');
    setSaving(true);
    try {
      // withdrawal is a deduction → store negative
      const signed = kind === 'WITHDRAWAL' ? -amount : amount;
      await client.models.FundEntry.create({
        date: date ? date.format('YYYY-MM-DD') : null,
        type: kind,
        amount: signed,
        note: note.trim() || null,
      });
      message.success('Saved');
      setAddOpen(false);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await client.models.FundEntry.delete({ id });
      message.success('Removed');
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    }
  }

  function openOpeningBalance() {
    setObAmount(openingEntry ? openingEntry.amount : null);
    setObDate(openingEntry?.date ? dayjs(openingEntry.date) : dayjs());
    setObOpen(true);
  }

  async function saveOpeningBalance() {
    if (obAmount == null || obAmount < 0) {
      return message.error('Enter the opening balance.');
    }
    setObSaving(true);
    try {
      const payload = {
        type: 'OPENING',
        amount: obAmount,
        date: obDate ? obDate.format('YYYY-MM-DD') : null,
        note: 'Opening balance',
      };
      if (openingEntry) {
        await client.models.FundEntry.update({ id: openingEntry.id, ...payload });
      } else {
        await client.models.FundEntry.create(payload);
      }
      message.success('Opening balance saved');
      setObOpen(false);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setObSaving(false);
    }
  }

  const rows = useMemo(
    () => [...entries].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [entries]
  );

  const typeTag = (t) => {
    const map = { DEPOSIT: 'green', WITHDRAWAL: 'red', TRADING: 'blue' };
    return <Tag color={map[t]}>{t}</Tag>;
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', width: 130 },
    { title: 'Type', dataIndex: 'type', width: 130, render: typeTag },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (v) => (
        <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{money(v)}</span>
      ),
    },
    { title: 'Note', dataIndex: 'note', render: (v) => v || '—' },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Popconfirm title="Delete this entry?" onConfirm={() => remove(r.id)} okText="Delete">
          <Button size="small" danger type="text">
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Funds
        </Typography.Title>
        <Typography.Text type="secondary">
          Cash ledger — deposits, withdrawals, and net trading cash — plus your
          total account value.
        </Typography.Text>
      </div>

      <Card size="small">
        <Space size="large" wrap>
          <Statistic title="Opening balance" value={money(totals.opening)} />
          <Statistic title="Net deposited" value={money(totals.netCapital)} />
          <Statistic title="Trading net" value={money(totals.trading)}
            valueStyle={{ color: totals.trading >= 0 ? '#3f8600' : '#cf1322' }} />
          <Statistic title="Cash balance" value={money(totals.cash)} />
          <Statistic title="Holdings value" value={money(holdingsValue)} />
          <Statistic title="Total account value" value={money(totals.totalValue)} />
          <Statistic
            title="Return"
            value={totals.returnPct == null ? '—' : `${totals.returnPct.toFixed(2)}%`}
            valueStyle={{ color: (totals.returnPct ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
          />
        </Space>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={openOpeningBalance}>
          {openingEntry ? 'Edit opening balance' : 'Set opening balance'}
        </Button>
        <Button type="primary" onClick={openAdd}>
          Add / withdraw funds
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        locale={{ emptyText: 'No fund entries yet.' }}
      />

      <Modal
        title="Fund entry"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={saveEntry}
        okText="Save"
        okButtonProps={{ loading: saving }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Segmented
            block
            value={kind}
            onChange={setKind}
            options={[
              { label: 'Deposit', value: 'DEPOSIT' },
              { label: 'Withdrawal', value: 'WITHDRAWAL' },
            ]}
          />
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={amount}
            onChange={setAmount}
            addonBefore="Amount ₹"
          />
          <DatePicker
            style={{ width: '100%' }}
            format="DD MMM YYYY"
            value={date}
            onChange={setDate}
          />
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Space>
      </Modal>

      {/* Opening balance */}
      <Modal
        title="Opening balance"
        open={obOpen}
        onCancel={() => setObOpen(false)}
        onOk={saveOpeningBalance}
        okText="Save"
        okButtonProps={{ loading: obSaving }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Typography.Text type="secondary">
            The cash you already had in the account when you started tracking. It
            counts toward your cash balance and net capital.
          </Typography.Text>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={obAmount}
            onChange={setObAmount}
            addonBefore="Opening ₹"
          />
          <DatePicker
            style={{ width: '100%' }}
            format="DD MMM YYYY"
            value={obDate}
            onChange={setObDate}
          />
        </Space>
      </Modal>
    </Space>
  );
}
