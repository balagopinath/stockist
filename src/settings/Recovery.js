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
  Select,
  DatePicker,
  Popconfirm,
  message,
} from 'antd';

const client = generateClient();

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function listAll(model) {
  let all = [];
  let nextToken = null;
  do {
    const { data, nextToken: nt, errors } =
      await model.list({ limit: 1000, nextToken });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    all = all.concat(data);
    nextToken = nt;
  } while (nextToken);
  return all;
}

export default function Recovery() {
  const [entries, setEntries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // adjust dialog
  const [adjustEntry, setAdjustEntry] = useState(null);
  const [adjustAmt, setAdjustAmt] = useState(null);
  const [saving, setSaving] = useState(false);

  // add-loss dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addCompany, setAddCompany] = useState(null);
  const [addAmount, setAddAmount] = useState(null);
  const [addDate, setAddDate] = useState(dayjs());

  async function load() {
    setLoading(true);
    try {
      if (!client.models.RecoveryEntry) {
        message.error('Recovery model not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      const [en, co] = await Promise.all([
        listAll(client.models.RecoveryEntry),
        listAll(client.models.Company),
      ]);
      setEntries(en);
      setCompanies(co);
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
  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: `${c.name} (${c.ISIN})` })),
    [companies]
  );

  // group entries per company
  const rows = useMemo(() => {
    const m = {};
    entries.forEach((e) => {
      const g = (m[e.companyId] = m[e.companyId] || {
        key: e.companyId,
        companyId: e.companyId,
        companyName: companyById[e.companyId]?.name ?? '—',
        outstanding: 0,
        entries: [],
      });
      g.outstanding += e.amount || 0;
      g.entries.push(e);
    });
    return Object.values(m)
      .map((g) => ({
        ...g,
        entries: [...g.entries].sort((a, b) =>
          String(a.incurredOn || '').localeCompare(String(b.incurredOn || ''))
        ),
      }))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [entries, companyById]);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  function openAdjust(entry) {
    setAdjustEntry(entry);
    setAdjustAmt(entry.amount); // default: recover the whole thing
  }

  async function saveAdjust() {
    if (adjustAmt == null || adjustAmt <= 0) {
      return message.error('Enter the amount recovered.');
    }
    setSaving(true);
    try {
      const remaining = adjustEntry.amount - adjustAmt;
      if (remaining <= 1e-6) {
        await client.models.RecoveryEntry.delete({ id: adjustEntry.id });
        message.success('Loss fully recovered — entry removed.');
      } else {
        await client.models.RecoveryEntry.update({ id: adjustEntry.id, amount: remaining });
        message.success(`Reduced by ${money(adjustAmt)}.`);
      }
      setAdjustEntry(null);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id) {
    try {
      await client.models.RecoveryEntry.delete({ id });
      message.success('Removed');
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    }
  }

  async function addLoss() {
    if (!addCompany || !(addAmount > 0)) {
      return message.error('Pick a company and a loss amount.');
    }
    try {
      await client.models.RecoveryEntry.create({
        companyId: addCompany,
        amount: addAmount,
        incurredOn: addDate ? addDate.format('YYYY-MM-DD') : null,
        note: 'Manual',
      });
      message.success('Loss added');
      setAddOpen(false);
      setAddCompany(null);
      setAddAmount(null);
      load();
    } catch (e) {
      message.error(`Failed: ${e.message}`);
    }
  }

  const columns = [
    { title: 'Company', dataIndex: 'companyName' },
    {
      title: 'Entries',
      dataIndex: 'entries',
      align: 'right',
      width: 90,
      render: (e) => e.length,
    },
    {
      title: 'Outstanding loss',
      dataIndex: 'outstanding',
      align: 'right',
      render: (v) => <span style={{ color: '#cf1322' }}>{money(v)}</span>,
    },
  ];

  const entryColumns = [
    { title: 'Date', dataIndex: 'incurredOn', render: (v) => v || '—' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (v) => <span style={{ color: '#cf1322' }}>{money(v)}</span>,
    },
    { title: 'Note', dataIndex: 'note', render: (v) => v || '—' },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_, e) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openAdjust(e)}>
            Adjust
          </Button>
          <Popconfirm
            title="Mark this loss fully recovered?"
            onConfirm={() => removeEntry(e.id)}
            okText="Recovered"
          >
            <Button size="small" type="link">
              Recovered
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Loss Recovery
        </Typography.Title>
        <Typography.Text type="secondary">
          Intraday losses to recover per stock. Adjust or clear as later profits
          make them up.
        </Typography.Text>
      </div>

      <Card size="small">
        <Space size="large" wrap>
          <Statistic title="Stocks with losses" value={rows.length} />
          <Statistic
            title="Total outstanding"
            value={money(totalOutstanding)}
            valueStyle={{ color: totalOutstanding > 0 ? '#cf1322' : undefined }}
          />
        </Space>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => setAddOpen(true)}>Add loss</Button>
      </div>

      <Table
        rowKey="key"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={entryColumns}
              dataSource={r.entries}
            />
          ),
        }}
        locale={{ emptyText: 'No losses to recover 🎉' }}
      />

      {/* Adjust an entry */}
      <Modal
        title={
          adjustEntry
            ? `Adjust — ${companyById[adjustEntry.companyId]?.name ?? ''}`
            : ''
        }
        open={!!adjustEntry}
        onCancel={() => setAdjustEntry(null)}
        onOk={saveAdjust}
        okText="Apply"
        okButtonProps={{ loading: saving }}
        destroyOnClose
      >
        {adjustEntry && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text type="secondary">
              Outstanding: {money(adjustEntry.amount)}. Enter how much you've
              recovered (profit applied). If it covers the whole amount, the entry
              is removed.
            </Typography.Text>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={adjustEntry.amount}
              value={adjustAmt}
              onChange={setAdjustAmt}
              addonBefore="Recovered ₹"
            />
          </Space>
        )}
      </Modal>

      {/* Add a manual loss */}
      <Modal
        title="Add loss"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={addLoss}
        okText="Add"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Company"
            optionFilterProp="label"
            options={companyOptions}
            value={addCompany}
            onChange={setAddCompany}
          />
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={addAmount}
            onChange={setAddAmount}
            addonBefore="Loss ₹"
          />
          <DatePicker
            style={{ width: '100%' }}
            format="DD MMM YYYY"
            value={addDate}
            onChange={setAddDate}
          />
        </Space>
      </Modal>
    </Space>
  );
}
