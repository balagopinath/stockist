import { useMemo, useState } from 'react';
import {
  Modal,
  Steps,
  Table,
  Button,
  Space,
  Select,
  Checkbox,
  Statistic,
  Card,
  Alert,
  Divider,
  Progress,
  Tooltip,
  Descriptions,
  Tag,
  Typography,
} from 'antd';

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const green = '#3f8600';
const red = '#cf1322';
const pnlSpan = (v) =>
  v == null ? '—' : <span style={{ color: v >= 0 ? green : red }}>{money(v)}</span>;

/**
 * Stepped tradebook-import dialog. Daily Trades parses the file and owns all
 * the state/handlers; this component just drives the wizard UI over them.
 */
export default function ImportWizard(props) {
  const {
    open,
    onClose,
    tradeDate,
    buys,
    sells,
    intra,
    unmatched,
    brokers,
    brokerId,
    setBrokerId,
    buyBackFlags,
    setBuyBackFlags,
    openSwingsByCompany,
    specByCompany,
    sellAlloc,
    allocTotal,
    sellPnl,
    sellRecoveryQty,
    sellShortQty,
    sellHeldQty,
    chooseLot,
    unchooseLot,
    autoFill,
    charges,
    totalPnl,
    netPnl,
    allSellsAllocated,
    processing,
    progress,
    onProcess,
    procError,
  } = props;

  const [step, setStep] = useState(0);
  const [pickerSell, setPickerSell] = useState(null); // sell index for lot picker

  // steps present for this file (skip empty)
  const stepKeys = useMemo(() => {
    const k = [];
    if (intra.length) k.push('intraday');
    if (buys.length) k.push('buys');
    if (sells.length) k.push('sells');
    k.push('review');
    return k;
  }, [intra.length, buys.length, sells.length]);

  const cur = stepKeys[Math.min(step, stepKeys.length - 1)];
  const isLast = step >= stepKeys.length - 1;
  const onSellsStep = cur === 'sells';
  const canNext = !onSellsStep || allSellsAllocated;

  const titleFor = {
    intraday: 'Intraday',
    buys: 'Delivery buys',
    sells: 'Delivery sells',
    review: 'Review & process',
  };

  function close() {
    setStep(0);
    setPickerSell(null);
    onClose && onClose();
  }

  // ---- step bodies ---------------------------------------------------------

  const intradayBody = (
    <Table
      rowKey={(_, i) => i}
      size="small"
      pagination={false}
      dataSource={intra}
      columns={[
        { title: 'Company', dataIndex: 'companyName' },
        { title: 'Exch', dataIndex: 'exchange', width: 70 },
        { title: 'Qty', dataIndex: 'qty', align: 'right' },
        { title: 'Avg buy', dataIndex: 'avgBuy', align: 'right', render: money },
        { title: 'Avg sell', dataIndex: 'avgSell', align: 'right', render: money },
        { title: 'P&L', dataIndex: 'pnl', align: 'right', render: pnlSpan },
      ]}
    />
  );

  const buysBody = (
    <Table
      rowKey={(_, i) => i}
      size="small"
      pagination={false}
      dataSource={buys}
      columns={[
        { title: 'Company', dataIndex: 'companyName' },
        { title: 'Exch', dataIndex: 'exchange', width: 70 },
        { title: 'Qty', dataIndex: 'qty', align: 'right' },
        { title: 'Price', dataIndex: 'price', align: 'right', render: money },
        {
          title: 'Buy-back?',
          key: 'bb',
          width: 190,
          render: (_, b, i) => {
            const sw = openSwingsByCompany[b.companyId] || [];
            if (sw.length === 0) return <span style={{ color: '#bbb' }}>—</span>;
            const pend = sw.reduce((s, x) => s + (x.qty || 0), 0);
            return (
              <Tooltip title={`${pend} share(s) open in recovery. Tick to close swings; untick to add as a new lot.`}>
                <Checkbox
                  checked={!!buyBackFlags[i]}
                  onChange={(e) => setBuyBackFlags((p) => ({ ...p, [i]: e.target.checked }))}
                >
                  Buy-back ({pend})
                </Checkbox>
              </Tooltip>
            );
          },
        },
      ]}
    />
  );

  const sellsBody = (
    <>
      {!allSellsAllocated ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Allot the shares you hold for each sell"
          description="Open “Choose lots” and allocate the lots you hold. Anything beyond your holdings is booked automatically as a short sell — you don't need to allot that part."
        />
      ) : (
        sells.some((_s, i) => sellShortQty && sellShortQty(i) > 0) && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Some sells include a short position"
            description="The quantity beyond your holdings is booked as a short sell — buy it back later to close it (profit = sell − buy-back)."
          />
        )
      )}
      <Table
        rowKey={(_, i) => i}
        size="small"
        pagination={false}
        dataSource={sells.map((s, i) => ({ ...s, _i: i }))}
        columns={[
          { title: 'Company', dataIndex: 'companyName' },
          { title: 'Exch', dataIndex: 'exchange', width: 70 },
          { title: 'Sold qty', dataIndex: 'qty', align: 'right' },
          {
            title: 'Allotted',
            align: 'right',
            render: (_, r) => {
              const t = allocTotal(r._i);
              const need = sellHeldQty ? Math.min(r.qty, sellHeldQty(r._i)) : r.qty;
              const ok = t >= need - 1e-6 && t <= r.qty + 1e-6;
              return (
                <span style={{ color: ok ? green : red }}>
                  {t} / {r.qty}
                </span>
              );
            },
          },
          {
            title: 'Booked P&L',
            align: 'right',
            render: (_, r) => pnlSpan(sellPnl(r._i)),
          },
          {
            title: 'Recovery',
            align: 'right',
            render: (_, r) =>
              sellRecoveryQty(r._i) > 0 ? (
                <Tag color="orange">{sellRecoveryQty(r._i)} swing</Tag>
              ) : (
                '—'
              ),
          },
          {
            title: 'Short',
            align: 'right',
            render: (_, r) =>
              sellShortQty && sellShortQty(r._i) > 0 ? (
                <Tag color="volcano">{sellShortQty(r._i)} short</Tag>
              ) : (
                '—'
              ),
          },
          {
            title: '',
            align: 'right',
            width: 120,
            render: (_, r) => {
              const t = allocTotal(r._i);
              const need = sellHeldQty ? Math.min(r.qty, sellHeldQty(r._i)) : r.qty;
              const ok = t >= need - 1e-6 && t <= r.qty + 1e-6;
              return (
                <Button size="small" type={ok ? 'default' : 'primary'} onClick={() => setPickerSell(r._i)}>
                  {ok ? 'Edit lots' : 'Choose lots'}
                </Button>
              );
            },
          },
        ]}
      />
    </>
  );

  const reviewBody = (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <Space size="large" wrap>
        <span>
          <Typography.Text type="secondary">Broker </Typography.Text>
          <Select
            size="small"
            style={{ minWidth: 160 }}
            placeholder="Broker"
            value={brokerId}
            onChange={setBrokerId}
            options={brokers.map((b) => ({ label: b.name, value: b.id }))}
            notFoundContent="No brokers configured"
          />
        </span>
      </Space>
      <Card size="small">
        <Space size="large" wrap>
          <Statistic title="Trade date" value={tradeDate || '—'} />
          <Statistic title="Buys" value={buys.length} />
          <Statistic title="Sells" value={sells.length} />
          <Statistic title="Intraday" value={intra.length} />
          <Statistic
            title="Realized P&L"
            value={money(totalPnl)}
            valueStyle={{ color: totalPnl >= 0 ? green : red }}
          />
          <Statistic
            title="Charges"
            value={charges ? money(charges.total) : '—'}
            valueStyle={{ color: red }}
          />
          <Statistic
            title="Net P&L"
            value={money(netPnl)}
            valueStyle={{ color: netPnl >= 0 ? green : red }}
          />
        </Space>
        {charges && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Descriptions size="small" column={{ xs: 2, sm: 3, md: 4 }} colon>
              <Descriptions.Item label="Brokerage">{money(charges.brokerage)}</Descriptions.Item>
              <Descriptions.Item label="STT">{money(charges.stt)}</Descriptions.Item>
              <Descriptions.Item label="Exch txn">{money(charges.exchTxn)}</Descriptions.Item>
              <Descriptions.Item label="SEBI">{money(charges.sebi)}</Descriptions.Item>
              <Descriptions.Item label="Stamp">{money(charges.stamp)}</Descriptions.Item>
              <Descriptions.Item label="DP">{money(charges.dp)}</Descriptions.Item>
              <Descriptions.Item label="GST">{money(charges.gst)}</Descriptions.Item>
              <Descriptions.Item label="Total">{money(charges.total)}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>
      {brokers.length === 0 && (
        <Alert
          type="info"
          showIcon
          message="No broker configured — charges won't be computed"
          description="Add a broker under Master data › Brokers if you want taxes & charges."
        />
      )}
      {unmatched.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${unmatched.length} symbol(s) skipped — no company for ISIN`}
          description={unmatched.join(', ')}
        />
      )}
      {procError && (
        <Alert type="error" showIcon message="Processing failed" description={procError} />
      )}
      {processing && <Progress percent={progress} />}
    </Space>
  );

  const body = {
    intraday: intradayBody,
    buys: buysBody,
    sells: sellsBody,
    review: reviewBody,
  }[cur];

  // ---- lot picker sub-dialog ----------------------------------------------

  const sell = pickerSell != null ? sells[pickerSell] : null;
  const pickerLots = sell ? specByCompany[sell.companyId] || [] : [];
  const pickerTotal = pickerSell != null ? allocTotal(pickerSell) : 0;
  const pickerRemaining = sell ? sell.qty - pickerTotal : 0;
  const pickerHeld = pickerLots.reduce((s, l) => s + (l.balanceQty ?? l.quantity), 0);

  return (
    <>
      <Modal
        title="Import tradebook"
        open={open}
        onCancel={processing ? undefined : close}
        width={860}
        footer={
          <Space>
            <Button disabled={step === 0 || processing} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {!isLast && (
              <Tooltip title={canNext ? '' : 'Allot every sell fully first'}>
                <Button type="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              </Tooltip>
            )}
            {isLast && (
              <Button
                type="primary"
                loading={processing}
                disabled={!allSellsAllocated}
                onClick={onProcess}
              >
                Process trades
              </Button>
            )}
          </Space>
        }
      >
        <Steps
          size="small"
          current={step}
          style={{ marginBottom: 16 }}
          items={stepKeys.map((k) => ({ title: titleFor[k] }))}
        />
        <div style={{ minHeight: 220 }}>{body}</div>
      </Modal>

      {/* per-sell lot picker */}
      <Modal
        title={sell ? `Choose lots — ${sell.companyName} (${sell.exchange})` : ''}
        open={pickerSell != null}
        onCancel={() => setPickerSell(null)}
        onOk={() => setPickerSell(null)}
        okText="Done"
        width={760}
      >
        {sell && (
          <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
            <Space size="large" wrap>
              <Statistic title="Sold qty" value={sell.qty} />
              <Statistic title="Sell price" value={money(sell.price)} />
              <Statistic
                title="Allotted"
                value={`${pickerTotal} / ${sell.qty}`}
                valueStyle={{ color: Math.abs(pickerTotal - sell.qty) < 1e-6 ? green : red }}
              />
              <Statistic title="Booked P&L" value={money(sellPnl(pickerSell))} valueStyle={{ color: sellPnl(pickerSell) >= 0 ? green : red }} />
              <Button size="small" onClick={() => autoFill(pickerSell, sell)}>
                Auto-fill (oldest first)
              </Button>
            </Space>
            {pickerHeld < sell.qty && (
              <Alert
                type="warning"
                showIcon
                message={`You hold ${pickerHeld} of ${sell.qty}. The uncovered ${sell.qty - pickerHeld} will be booked as a short sell (buy back later to close).`}
              />
            )}
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={pickerLots}
              columns={[
                {
                  title: 'Buy date',
                  dataIndex: 'buyDate',
                  sorter: (a, b) => String(a.buyDate || '').localeCompare(String(b.buyDate || '')),
                  defaultSortOrder: 'ascend',
                },
                {
                  title: 'Buy price',
                  dataIndex: 'avgPrice',
                  align: 'right',
                  render: money,
                  sorter: (a, b) => (a.avgPrice || 0) - (b.avgPrice || 0),
                },
                {
                  title: 'Available',
                  align: 'right',
                  render: (_, l) => (l.balanceQty ?? l.quantity)?.toLocaleString('en-IN'),
                },
                {
                  title: 'P&L / share',
                  align: 'right',
                  render: (_, l) => pnlSpan(sell.price - l.avgPrice),
                },
                {
                  title: 'Chosen',
                  align: 'right',
                  render: (_, l) => sellAlloc(pickerSell)[l.id] || 0,
                },
                {
                  title: '',
                  align: 'right',
                  width: 100,
                  render: (_, l) => {
                    const chosen = (sellAlloc(pickerSell)[l.id] || 0) > 0;
                    return chosen ? (
                      <Button size="small" danger type="text" onClick={() => unchooseLot(pickerSell, l.id)}>
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        disabled={pickerRemaining <= 0}
                        onClick={() => chooseLot(pickerSell, sell, l)}
                      >
                        Choose
                      </Button>
                    );
                  },
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </>
  );
}
