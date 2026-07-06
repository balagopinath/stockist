import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import dayjs from 'dayjs';
import {
  Space,
  DatePicker,
  Card,
  Statistic,
  Table,
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

export default function HoldingsByDate() {
  const [lots, setLots] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(dayjs());

  async function load() {
    setLoading(true);
    try {
      if (!client.models.HoldingFIFO) {
        message.error('Holdings model not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      // all lots (incl. sold-out) so the historical "brought in" view is complete
      const [l, co] = await Promise.all([
        listAll(client.models.HoldingFIFO),
        listAll(client.models.Company),
      ]);
      setLots(l);
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

  const dateStr = date ? date.format('YYYY-MM-DD') : null;

  // lots brought in on the chosen date, grouped by company
  const rows = useMemo(() => {
    const onDate = lots.filter((l) => l.buyDate === dateStr);
    const byCompany = {};
    onDate.forEach((l) => {
      const g = (byCompany[l.companyId] = byCompany[l.companyId] || {
        companyId: l.companyId,
        lots: [],
        boughtQty: 0,
        balanceQty: 0,
        cost: 0,
      });
      g.lots.push(l);
      g.boughtQty += l.quantity || 0;
      g.balanceQty += l.balanceQty ?? l.quantity ?? 0;
      g.cost += (l.quantity || 0) * (l.avgPrice || 0);
    });
    return Object.values(byCompany)
      .map((g) => ({
        key: g.companyId,
        companyName: companyById[g.companyId]?.name ?? '—',
        lotCount: g.lots.length,
        boughtQty: g.boughtQty,
        balanceQty: g.balanceQty,
        avgPrice: g.boughtQty > 0 ? g.cost / g.boughtQty : 0,
        invested: g.cost,
        lots: [...g.lots].sort((a, b) => a.avgPrice - b.avgPrice),
      }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [lots, dateStr, companyById]);

  const totalBought = rows.reduce((s, r) => s + r.boughtQty, 0);
  const totalInvested = rows.reduce((s, r) => s + r.invested, 0);

  const columns = [
    { title: 'Company', dataIndex: 'companyName' },
    { title: 'Lots', dataIndex: 'lotCount', align: 'right', width: 70 },
    {
      title: 'Bought qty',
      dataIndex: 'boughtQty',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
    },
    {
      title: 'Balance qty',
      dataIndex: 'balanceQty',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
    },
    { title: 'Avg buy price', dataIndex: 'avgPrice', align: 'right', render: money },
    { title: 'Invested', dataIndex: 'invested', align: 'right', render: money },
  ];

  const lotColumns = [
    { title: 'Buy price', dataIndex: 'avgPrice', align: 'right', render: money },
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
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <Space>
        <span>Buy date:</span>
        <DatePicker
          value={date}
          onChange={setDate}
          format="DD MMM YYYY"
          allowClear={false}
        />
      </Space>

      <Card size="small">
        <Space size="large" wrap>
          <Statistic title="Companies" value={rows.length} />
          <Statistic title="Total bought qty" value={totalBought.toLocaleString('en-IN')} />
          <Statistic title="Total invested" value={money(totalInvested)} />
        </Space>
      </Card>

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
              columns={lotColumns}
              dataSource={r.lots}
              pagination={false}
            />
          ),
        }}
        locale={{ emptyText: `No lots brought in on ${dateStr}.` }}
      />
    </Space>
  );
}
