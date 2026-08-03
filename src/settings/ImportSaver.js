import { useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Modal, Table, Button, Space, Tag, Alert, Progress, Typography, message } from 'antd';

const client = generateClient();
const RECOVERY_ENABLED = !!client.models.RecoverySwing;

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
const asObj = (v) => {
  if (v && typeof v === 'object') return v;
  try {
    return JSON.parse(v || '{}');
  } catch {
    return {};
  }
};

// blank per-company created-ids record
const emptyCreated = () => ({
  fifoCreated: [],
  specCreated: [],
  details: [],
  allocations: [],
  swingsCreated: [],
  swingsClosed: [], // { id, qty, sellPrice, sellDate, specificLotId }
  recEntries: [],
  fifoReduced: [], // { id, qty }
  specDelta: [], // { id, delta }  (+ restored, − reduced)
});

/**
 * Runs a tradebook save company-by-company from a persisted ImportRun, showing
 * live status and allowing resume from the failed company (even after reload).
 *
 * Props:
 *   open, onClose, onDone
 *   plan       — a fresh plan to start (see DailyTrades.buildImportPlan)
 *   resumeRun  — an existing ImportRun record to resume
 */
export default function ImportSaver({ open, onClose, onDone, plan, resumeRun }) {
  const [run, setRun] = useState(null); // the ImportRun record
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [curCid, setCurCid] = useState(null);
  const holdings = useRef(null); // { fifoById, specById, ... working copies }

  // progress helpers -------------------------------------------------------
  const progress = run ? asObj(run.progress) : {};
  const planObj = run ? asObj(run.plan) : plan || {};
  const companies = planObj.companies || [];

  const rows = useMemo(() => {
    const list = [
      { key: 'setup', label: 'Create tradebook', kind: 'setup' },
      ...companies.map((c) => ({ key: c.companyId, label: c.companyName, kind: 'company' })),
      { key: 'finalize', label: 'Finalize (funds & P&L)', kind: 'finalize' },
    ];
    return list.map((r) => {
      const p =
        r.kind === 'company'
          ? (progress.companies || {})[r.key]
          : progress[r.key];
      return { ...r, status: p?.status || 'pending', error: p?.error || null };
    });
  }, [companies, progress]);

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errored = rows.find((r) => r.status === 'error');
  const allDone = rows.length > 0 && rows.every((r) => r.status === 'done');

  // ---- setup on open -----------------------------------------------------
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      if (!client.models.ImportRun) {
        message.error(
          'The ImportRun model isn’t deployed yet. Run "npm run sandbox:once", then retry.'
        );
        onClose && onClose();
        return;
      }
      setLoading(true);
      try {
        // create or load the ImportRun
        let rec = resumeRun || null;
        if (!rec) {
          const setup = { setup: { status: 'pending' }, companies: {}, finalize: { status: 'pending' } };
          const { data, errors } = await client.models.ImportRun.create({
            tradeDate: plan.tradeDate,
            status: 'RUNNING',
            brokerId: plan.brokerId || null,
            plan: JSON.stringify(plan),
            progress: JSON.stringify(setup),
          });
          if (errors) throw new Error(errors.map((e) => e.message).join(', '));
          rec = data;
        }
        await loadHoldings();
        if (active) setRun(rec);
      } catch (e) {
        message.error(`Couldn't start: ${e.message}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadHoldings() {
    const active = { soldOut: { ne: true } };
    const [fifo, spec, pf, sw] = await Promise.all([
      listAll(client.models.HoldingFIFO, active),
      listAll(client.models.HoldingSpecificLot),
      listAll(client.models.PortfolioItem),
      RECOVERY_ENABLED ? listAll(client.models.RecoverySwing, { status: { eq: 'OPEN' } }) : [],
    ]);
    const fifoByCompany = {};
    fifo.forEach((l) => (fifoByCompany[l.companyId] = fifoByCompany[l.companyId] || []).push(l));
    Object.values(fifoByCompany).forEach((a) => a.sort((x, y) => (x.buyDate < y.buyDate ? -1 : 1)));
    const specById = Object.fromEntries(spec.map((l) => [l.id, l]));
    const openSwings = {};
    sw.forEach((s) => (openSwings[s.companyId] = openSwings[s.companyId] || []).push(s));
    Object.values(openSwings).forEach((a) =>
      a.sort((x, y) => String(x.sellDate || '').localeCompare(String(y.sellDate || '')))
    );
    holdings.current = {
      fifoByCompany,
      specById,
      openSwings,
      portfolioSet: new Set(pf.map((p) => p.companyId)),
    };
  }

  // ---- persistence of progress ------------------------------------------
  async function saveProgress(next, status) {
    const { data } = await client.models.ImportRun.update({
      id: run.id,
      progress: JSON.stringify(next),
      ...(status ? { status } : {}),
    });
    setRun(data || { ...run, progress: JSON.stringify(next), status: status || run.status });
    return next;
  }

  // ---- the runner --------------------------------------------------------
  async function runAll() {
    if (!run) return;
    setRunning(true);
    let prog = asObj(run.progress);
    try {
      // setup
      if (prog.setup?.status !== 'done') {
        setCurCid('setup');
        if (!prog.setup?.bookId) {
          const { data, errors } = await client.models.TradeBook.create({
            tradeDate: planObj.tradeDate,
            realizedPnl: planObj.totalPnl ?? null,
            note: 'Tradebook import',
            buyCount: companies.reduce((s, c) => s + (c.buys?.length || 0), 0),
            sellCount: companies.reduce((s, c) => s + (c.sells?.length || 0), 0),
            intradayCount: companies.reduce((s, c) => s + (c.intra?.length || 0), 0),
            brokerId: planObj.brokerId || null,
            charges: planObj.charges ? planObj.charges.total : null,
            chargesBreakdown: planObj.charges ? JSON.stringify(planObj.charges) : null,
          });
          if (errors) throw new Error(errors.map((e) => e.message).join(', '));
          prog.setup = { status: 'done', bookId: data.id };
        } else {
          prog.setup.status = 'done';
        }
        prog = await saveProgress(prog);
      }
      const bookId = prog.setup.bookId;

      // companies
      for (const cp of companies) {
        const cur = (prog.companies || {})[cp.companyId];
        if (cur?.status === 'done') continue;
        setCurCid(cp.companyId);
        // roll back any partial writes from a prior failed attempt
        if (cur?.created) await rollbackCompany(cur.created);
        prog.companies = prog.companies || {};
        prog.companies[cp.companyId] = { status: 'running', created: emptyCreated() };
        prog = await saveProgress(prog);
        try {
          const created = await runCompany(cp, bookId);
          prog.companies[cp.companyId] = { status: 'done', created };
          prog = await saveProgress(prog);
        } catch (e) {
          prog.companies[cp.companyId] = {
            status: 'error',
            error: e.message || String(e),
            created: window.__lastCreated || emptyCreated(),
          };
          await saveProgress(prog, 'ERROR');
          throw e;
        }
      }

      // finalize
      if (prog.finalize?.status !== 'done') {
        setCurCid('finalize');
        await finalize(bookId);
        prog.finalize = { status: 'done' };
        prog = await saveProgress(prog, 'DONE');
      }

      message.success('Import saved.');
      // clear the completed run
      try {
        await client.models.ImportRun.delete({ id: run.id });
      } catch {
        /* ignore */
      }
      setCurCid(null);
      onDone && onDone();
    } catch (e) {
      message.error(`Stopped: ${e.message}`);
    } finally {
      setRunning(false);
      setCurCid(null);
    }
  }

  // ---- per-company execution --------------------------------------------
  async function runCompany(cp, bookId) {
    const created = emptyCreated();
    window.__lastCreated = created; // captured into progress if this throws
    const H = holdings.current;
    const cid = cp.companyId;

    // BUYS
    for (const b of cp.buys || []) {
      const f = await client.models.HoldingFIFO.create({
        companyId: cid,
        buyDate: planObj.tradeDate,
        quantity: b.qty,
        balanceQty: b.qty,
        avgPrice: b.price,
        soldOut: false,
      });
      if (f.data) created.fifoCreated.push(f.data.id);
      if (!H.portfolioSet.has(cid)) {
        await client.models.PortfolioItem.create({ companyId: cid });
        H.portfolioSet.add(cid);
      }
      const det = (
        await client.models.TradeDetail.create({
          tradeBookId: bookId,
          companyId: cid,
          symbol: b.symbol,
          exchange: b.exchange,
          tradeType: 'DELIVERY',
          side: 'BUY',
          quantity: b.qty,
          price: b.price,
        })
      ).data;
      if (det) created.details.push(det.id);

      let remaining = b.qty;
      const swings = (H.openSwings[cid] || []).filter((s) => s.qty > 0);
      if (b.buyBack && RECOVERY_ENABLED && swings.length) {
        for (const sw of swings) {
          if (remaining <= 1e-9) break;
          const m = Math.min(remaining, sw.qty);
          remaining -= m;
          const lot = H.specById[sw.specificLotId];
          if (lot) {
            const nb = (lot.balanceQty ?? lot.quantity) + m;
            lot.balanceQty = nb;
            await client.models.HoldingSpecificLot.update({ id: lot.id, balanceQty: nb, soldOut: false, recovering: true });
            created.specDelta.push({ id: lot.id, delta: m });
          }
          const profit = (sw.sellPrice - b.price) * m;
          if (m >= sw.qty - 1e-9) {
            await client.models.RecoverySwing.update({
              id: sw.id, status: 'CLOSED', closeType: 'BUYBACK', buyBackPrice: b.price, buyBackDate: planObj.tradeDate, profit, closeTradeDetailId: det?.id,
            });
            created.swingsClosed.push({ id: sw.id, qty: sw.qty });
            sw.qty = 0;
          } else {
            await client.models.RecoverySwing.update({ id: sw.id, qty: sw.qty - m });
            created.swingsClosed.push({ id: sw.id, qty: m, partial: true });
            const nc = (
              await client.models.RecoverySwing.create({
                companyId: cid, specificLotId: sw.specificLotId, qty: m, sellPrice: sw.sellPrice, sellDate: sw.sellDate,
                status: 'CLOSED', closeType: 'BUYBACK', buyBackPrice: b.price, buyBackDate: planObj.tradeDate, profit, closeTradeDetailId: det?.id,
              })
            ).data;
            if (nc) created.swingsCreated.push(nc.id);
            sw.qty -= m;
          }
        }
      }
      if (remaining > 1e-9) {
        const sl = (
          await client.models.HoldingSpecificLot.create({
            companyId: cid, buyDate: planObj.tradeDate, quantity: remaining, balanceQty: remaining, avgPrice: b.price, soldOut: false,
          })
        ).data;
        if (sl) {
          created.specCreated.push(sl.id);
          if (det) {
            const al = (
              await client.models.TradeLotAllocation.create({ tradeDetailId: det.id, specificLotId: sl.id, quantity: remaining, kind: 'OPEN' })
            ).data;
            if (al) created.allocations.push(al.id);
          }
        }
      }
    }

    // SELLS
    for (const s of cp.sells || []) {
      // FIFO reduce oldest
      let left = s.qty;
      for (const lot of H.fifoByCompany[cid] || []) {
        if (left <= 0) break;
        const bal = lot.balanceQty ?? lot.quantity;
        if (bal <= 0) continue;
        const take = Math.min(bal, left);
        const nb = bal - take;
        await client.models.HoldingFIFO.update({ id: lot.id, balanceQty: nb, soldOut: nb <= 1e-9 });
        lot.balanceQty = nb;
        created.fifoReduced.push({ id: lot.id, qty: take });
        left -= take;
      }
      // realized P&L = profit-lot portions only
      let pnl = 0;
      for (const [lotId, q] of Object.entries(s.alloc || {})) {
        const lot = H.specById[lotId];
        if (lot && !(RECOVERY_ENABLED && s.price < lot.avgPrice)) pnl += (s.price - lot.avgPrice) * (Number(q) || 0);
      }
      const det = (
        await client.models.TradeDetail.create({
          tradeBookId: bookId, companyId: cid, symbol: s.symbol, exchange: s.exchange, tradeType: 'DELIVERY', side: 'SELL', quantity: s.qty, price: s.price, realizedPnl: pnl,
        })
      ).data;
      if (det) created.details.push(det.id);
      for (const [lotId, q] of Object.entries(s.alloc || {})) {
        const qty = Number(q) || 0;
        if (qty <= 0) continue;
        const lot = H.specById[lotId];
        if (!lot) throw new Error(`Lot not found for ${cp.companyName} — re-check the allocation.`);
        const bal = lot.balanceQty ?? lot.quantity;
        const nb = bal - qty;
        const isRecovery = RECOVERY_ENABLED && s.price < lot.avgPrice;
        await client.models.HoldingSpecificLot.update({
          id: lotId, balanceQty: nb, soldOut: isRecovery ? false : nb <= 1e-9, ...(RECOVERY_ENABLED ? { recovering: isRecovery ? true : lot.recovering ?? false } : {}),
        });
        lot.balanceQty = nb;
        created.specDelta.push({ id: lotId, delta: -qty });
        if (isRecovery && client.models.RecoverySwing) {
          const nc = (
            await client.models.RecoverySwing.create({ companyId: cid, specificLotId: lotId, qty, sellPrice: s.price, sellDate: planObj.tradeDate, status: 'OPEN', openTradeDetailId: det?.id })
          ).data;
          if (nc) created.swingsCreated.push(nc.id);
        } else if (det) {
          const al = (
            await client.models.TradeLotAllocation.create({ tradeDetailId: det.id, specificLotId: lotId, quantity: qty, kind: 'REDUCE' })
          ).data;
          if (al) created.allocations.push(al.id);
        }
      }
    }

    // INTRADAY
    let intraNet = 0;
    for (const m of cp.intra || []) {
      const det = (
        await client.models.TradeDetail.create({
          tradeBookId: bookId, companyId: cid, symbol: m.symbol, exchange: m.exchange, tradeType: 'INTRADAY', quantity: m.qty, avgBuy: m.avgBuy, avgSell: m.avgSell, realizedPnl: m.pnl,
        })
      ).data;
      if (det) created.details.push(det.id);
      intraNet += m.pnl;
    }
    if (intraNet < 0 && client.models.RecoveryEntry) {
      const re = (
        await client.models.RecoveryEntry.create({ companyId: cid, amount: -intraNet, incurredOn: planObj.tradeDate, note: 'Intraday loss' })
      ).data;
      if (re) created.recEntries.push(re.id);
    }

    window.__lastCreated = null;
    return created;
  }

  // undo everything a company step created (before a retry)
  async function rollbackCompany(c) {
    if (!c) return;
    const safe = async (fn) => {
      try {
        await fn();
      } catch {
        /* ignore */
      }
    };
    for (const a of c.allocations || []) await safe(() => client.models.TradeLotAllocation.delete({ id: a }));
    for (const id of c.swingsCreated || []) await safe(() => client.models.RecoverySwing.delete({ id }));
    for (const sc of c.swingsClosed || []) {
      await safe(() =>
        client.models.RecoverySwing.update({ id: sc.id, status: 'OPEN', closeType: null, buyBackPrice: null, buyBackDate: null, profit: null, closeTradeDetailId: null })
      );
    }
    for (const id of c.recEntries || []) await safe(() => client.models.RecoveryEntry.delete({ id }));
    for (const id of c.details || []) await safe(() => client.models.TradeDetail.delete({ id }));
    for (const id of c.specCreated || []) await safe(() => client.models.HoldingSpecificLot.delete({ id }));
    for (const id of c.fifoCreated || []) await safe(() => client.models.HoldingFIFO.delete({ id }));
    // revert balance changes (need fresh reads)
    for (const r of c.fifoReduced || []) {
      await safe(async () => {
        const { data } = await client.models.HoldingFIFO.get({ id: r.id });
        if (data) await client.models.HoldingFIFO.update({ id: r.id, balanceQty: (data.balanceQty ?? 0) + r.qty, soldOut: false });
      });
    }
    for (const d of c.specDelta || []) {
      await safe(async () => {
        const { data } = await client.models.HoldingSpecificLot.get({ id: d.id });
        if (data) {
          const nb = (data.balanceQty ?? 0) - d.delta;
          await client.models.HoldingSpecificLot.update({ id: d.id, balanceQty: nb, soldOut: nb <= 1e-9 && !(data.recovering ?? false) });
        }
      });
    }
    await loadHoldings(); // refresh working copies
  }

  async function finalize(bookId) {
    const p = planObj;
    if (client.models.FundEntry && Math.abs(p.fundNet || 0) > 1e-6) {
      await client.models.FundEntry.create({ date: p.tradeDate, type: 'TRADING', amount: p.fundNet, note: 'Trading (day net)' });
    }
    // recovered buy-back profit already folded via per-company; refresh book P&L
    await client.models.TradeBook.update({ id: bookId, realizedPnl: p.totalPnl ?? null });
  }

  async function discard() {
    if (run) {
      try {
        await client.models.ImportRun.delete({ id: run.id });
      } catch {
        /* ignore */
      }
    }
    onClose && onClose();
  }

  const statusTag = (s) => {
    if (s === 'done') return <Tag color="green">✓ Done</Tag>;
    if (s === 'running') return <Tag color="blue">⟳ Running</Tag>;
    if (s === 'error') return <Tag color="red">✕ Failed</Tag>;
    return <Tag>○ Pending</Tag>;
  };

  return (
    <Modal
      title={`Save import — ${planObj.tradeDate || ''}`}
      open={open}
      onCancel={running ? undefined : onClose}
      maskClosable={false}
      width={640}
      footer={
        <Space>
          <Button onClick={onClose} disabled={running}>
            Close
          </Button>
          {!allDone && (
            <Button danger onClick={discard} disabled={running}>
              Discard import
            </Button>
          )}
          {!allDone && (
            <Button type="primary" loading={running || loading} onClick={runAll}>
              {errored || doneCount > 1 ? 'Resume' : 'Start save'}
            </Button>
          )}
        </Space>
      }
    >
      <Progress
        percent={rows.length ? Math.round((doneCount / rows.length) * 100) : 0}
        status={errored ? 'exception' : allDone ? 'success' : 'active'}
      />
      {errored && (
        <Alert
          type="error"
          showIcon
          style={{ margin: '8px 0' }}
          message={`Failed at ${errored.label}`}
          description={
            <span>
              {errored.error} — fix if needed, then <strong>Resume</strong> to continue from here.
            </span>
          }
        />
      )}
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: 'Step',
            dataIndex: 'label',
            render: (v, r) => (
              <span style={{ fontWeight: r.key === curCid ? 600 : 400 }}>{v}</span>
            ),
          },
          { title: 'Status', key: 'st', width: 120, render: (_, r) => statusTag(r.status) },
        ]}
        scroll={{ y: 360 }}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Companies with sells run last. Progress is saved — if this fails, you can Resume from the
        broken step (even after reloading).
      </Typography.Text>
    </Modal>
  );
}
