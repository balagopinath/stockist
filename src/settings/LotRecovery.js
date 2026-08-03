import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Space, Typography, Statistic, Table, Button, Tag, Popconfirm, message } from 'antd';

const client = generateClient();

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const green = '#3f8600';
const red = '#cf1322';

/**
 * Read-only recovery scorecard for a specific lot (shown in the Portfolio
 * lot dialog when the lot is recovering).
 *
 * Recovery is driven by the daybook import: selling a lot below its cost opens
 * a swing; buying it back closes the swing. The ONLY action here is a manual
 * "Close" on a still-open swing — the write-off case where you give up on the
 * buy-back (e.g. you've recovered the loss with profit from another stock).
 */
export default function LotRecovery({ lot, ltp, swings = [], onChange }) {
  const [busyId, setBusyId] = useState(null);

  const held = lot.balanceQty ?? lot.quantity;
  const openSwings = swings.filter((s) => s.status === 'OPEN');
  const pendingQty = openSwings.reduce((a, s) => a + (s.qty || 0), 0);
  const recoveryProfit = swings
    .filter((s) => s.status === 'CLOSED' && s.closeType === 'BUYBACK')
    .reduce((a, s) => a + (s.profit || 0), 0);
  const unrealLoss = ltp != null ? Math.max(0, (lot.avgPrice - ltp) * held) : null;
  const remaining =
    unrealLoss != null ? Math.max(0, unrealLoss - recoveryProfit) : null;

  async function closeManual(s) {
    setBusyId(s.id);
    try {
      await client.models.RecoverySwing.update({
        id: s.id,
        status: 'CLOSED',
        closeType: 'MANUAL',
      });
      // shares stay sold; if nothing is held and no other open swing, close lot
      const otherOpen = openSwings.filter((x) => x.id !== s.id).length;
      if (held <= 1e-9 && otherOpen === 0) {
        await client.models.HoldingSpecificLot.update({ id: lot.id, soldOut: true });
      }
      message.success('Swing closed');
      onChange && onChange();
    } catch (e) {
      message.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!lot.recovering && swings.length === 0) {
    return <Typography.Text type="secondary">This lot isn't in recovery.</Typography.Text>;
  }

  const swingCols = [
    { title: 'Sold on', dataIndex: 'sellDate', render: (v) => v || '—' },
    { title: 'Qty', dataIndex: 'qty', align: 'right' },
    { title: 'Sell ₹', dataIndex: 'sellPrice', align: 'right', render: money },
    {
      title: 'Buy-back ₹',
      dataIndex: 'buyBackPrice',
      align: 'right',
      render: (v) => (v == null ? '—' : money(v)),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, s) =>
        s.status === 'OPEN' ? (
          <Tag color="gold">Open</Tag>
        ) : (
          <Tag color={s.closeType === 'BUYBACK' ? 'green' : 'default'}>
            {s.closeType === 'BUYBACK' ? 'Bought back' : 'Closed'}
          </Tag>
        ),
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      align: 'right',
      render: (v) =>
        v == null ? '—' : <span style={{ color: v >= 0 ? green : red }}>{money(v)}</span>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      width: 90,
      render: (_, s) =>
        s.status === 'OPEN' ? (
          <Popconfirm
            title="Close this swing without buying back?"
            description="The shares stay sold and no profit is recorded."
            okText="Close"
            okButtonProps={{ loading: busyId === s.id }}
            onConfirm={() => closeManual(s)}
          >
            <Button size="small" type="text" danger>
              Close
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <Space size="large" wrap>
        <Statistic title="Held now" value={held?.toLocaleString('en-IN')} />
        <Statistic title="Buy price" value={money(lot.avgPrice)} />
        <Statistic
          title="Unrealized loss"
          value={unrealLoss == null ? '—' : money(unrealLoss)}
          valueStyle={{ color: red }}
        />
        <Statistic
          title="Recovered"
          value={money(recoveryProfit)}
          valueStyle={{ color: recoveryProfit >= 0 ? green : red }}
        />
        <Statistic
          title="Remaining loss"
          value={remaining == null ? '—' : money(remaining)}
          valueStyle={{ color: remaining > 0 ? red : green }}
        />
        {pendingQty > 0 && (
          <Statistic title="Pending (sold, not bought back)" value={pendingQty} />
        )}
      </Space>

      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={swingCols}
        dataSource={[...swings].sort((a, b) =>
          String(b.sellDate || '').localeCompare(String(a.sellDate || ''))
        )}
        locale={{ emptyText: 'No swings yet.' }}
      />
    </Space>
  );
}
