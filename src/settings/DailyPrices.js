import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Typography,
  Button,
  Space,
  Upload,
  Alert,
  Progress,
  Statistic,
  Card,
  Table,
  message,
} from 'antd';

const client = generateClient();

function pick(row, key) {
  const found = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === key.toLowerCase()
  );
  return found ? String(row[found] ?? '').trim() : '';
}
const num = (v) => {
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

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

// run async fn over items with limited concurrency
async function inBatches(items, size, fn, onTick) {
  let done = 0;
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(slice.map((it) => fn(it)));
    done += slice.length;
    onTick?.(done);
  }
}

export default function DailyPrices() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState(null); // most recent asOfDate seen
  const [uploads, setUploads] = useState([]); // upload history
  const [rows, setRows] = useState([]); // parsed + resolved
  const [fileDate, setFileDate] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  async function load() {
    setLoading(true);
    try {
      if (!client.models.DailyQuote) {
        message.error('DailyQuote model not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      const [co, cur, ups] = await Promise.all([
        listAll(client.models.Company),
        listAll(client.models.CurrentQuote),
        client.models.PriceUpload ? listAll(client.models.PriceUpload) : [],
      ]);
      setCompanies(co);
      const maxDate = cur.reduce(
        (m, q) => (q.asOfDate > m ? q.asOfDate : m),
        ''
      );
      setLatest(maxDate || null);
      setUploads(
        [...ups].sort((a, b) =>
          String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        )
      );
    } catch (e) {
      message.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isinToCompanyId = useMemo(() => {
    const m = {};
    companies.forEach((c) => {
      if (c.ISIN) m[c.ISIN.toLowerCase()] = c.id;
    });
    return m;
  }, [companies]);

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        let date = null;
        const parsed = data
          .map((raw) => {
            const isin = pick(raw, 'ISIN');
            const d = pick(raw, 'TradDt');
            if (d) date = d;
            const companyId = isinToCompanyId[isin.toLowerCase()];
            return {
              companyId,
              isin,
              date: d,
              open: num(pick(raw, 'OpnPric')),
              high: num(pick(raw, 'HghPric')),
              low: num(pick(raw, 'LwPric')),
              close: num(pick(raw, 'ClsPric')),
              ltp: num(pick(raw, 'LastPric')),
              prevClose: num(pick(raw, 'PrvsClsgPric')),
              volume: num(pick(raw, 'TtlTradgVol')),
              tradedValue: num(pick(raw, 'TtlTrfVal')),
            };
          })
          .filter((r) => r.date); // ignore blank lines
        setFileDate(date);
        setRows(parsed);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
  }

  const matched = rows.filter((r) => r.companyId);
  const skipped = rows.length - matched.length;

  async function runImport() {
    if (matched.length === 0) return message.info('No matching companies in file.');
    setImporting(true);
    setProgress(0);

    // existing current quotes → decide create vs update + newer-date rule
    const existingCurrent = {};
    (await listAll(client.models.CurrentQuote)).forEach((q) => {
      existingCurrent[q.companyId] = q.asOfDate;
    });

    let failed = 0;
    await inBatches(
      matched,
      25,
      async (r) => {
        // DailyQuote: upsert by (companyId, date)
        const dq = {
          companyId: r.companyId,
          date: r.date,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          ltp: r.ltp,
          prevClose: r.prevClose,
          volume: r.volume,
          tradedValue: r.tradedValue,
        };
        let res = await client.models.DailyQuote.create(dq);
        if (res.errors) res = await client.models.DailyQuote.update(dq);
        if (res.errors) {
          failed += 1;
          return;
        }

        // CurrentQuote: only refresh if this file's date is newer (or equal)
        const prevAsOf = existingCurrent[r.companyId];
        if (prevAsOf && prevAsOf > r.date) return; // stale file, keep newer
        const cq = {
          companyId: r.companyId,
          asOfDate: r.date,
          ltp: r.ltp,
          close: r.close,
          prevClose: r.prevClose,
          volume: r.volume,
        };
        let cres = prevAsOf
          ? await client.models.CurrentQuote.update(cq)
          : await client.models.CurrentQuote.create(cq);
        if (cres.errors) await client.models.CurrentQuote.update(cq);
      },
      (done) => setProgress(Math.round((done / matched.length) * 100))
    );

    // log this upload
    try {
      await client.models.PriceUpload.create({
        date: fileDate,
        quotes: matched.length - failed,
        skipped,
      });
    } catch {
      // non-fatal
    }

    setImporting(false);
    setRows([]);
    setFileDate(null);
    if (failed) message.warning(`Imported with ${failed} failures.`);
    else message.success(`Imported ${matched.length} quotes for ${fileDate}.`);
    load();
  }

  const previewColumns = [
    { title: 'ISIN', dataIndex: 'isin' },
    { title: 'Close', dataIndex: 'close', align: 'right' },
    { title: 'LTP', dataIndex: 'ltp', align: 'right' },
    { title: 'Prev close', dataIndex: 'prevClose', align: 'right' },
    {
      title: 'Volume',
      dataIndex: 'volume',
      align: 'right',
      render: (v) => v?.toLocaleString('en-IN'),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Daily Prices
        </Typography.Title>
        <Typography.Text type="secondary">
          Upload the daily bhavcopy — it updates price history and the latest
          quote per company.
        </Typography.Text>
      </div>

      <Card size="small">
        <Space size="large" wrap>
          <Statistic title="Companies" value={companies.length} loading={loading} />
          <Statistic title="Latest priced day" value={latest || '—'} />
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 8 }}>
        <Upload accept=".csv,.CSV" showUploadList={false} beforeUpload={handleFile}>
          <Button>{rows.length ? 'Choose another file' : 'Choose bhavcopy CSV'}</Button>
        </Upload>
        <Button
          type="primary"
          loading={importing}
          disabled={matched.length === 0}
          onClick={runImport}
        >
          Import {matched.length ? `${matched.length}` : ''}
        </Button>
      </div>

      {rows.length > 0 && (
        <Alert
          type="info"
          showIcon
          message={`File date ${fileDate || '—'} · ${matched.length} matched · ${skipped} skipped (no company for ISIN)`}
          description="Matched rows update DailyQuote (history) and CurrentQuote (latest, if newer). Unmatched ISINs are ignored."
        />
      )}
      {importing && <Progress percent={progress} />}

      {rows.length > 0 && (
        <Table
          rowKey={(_, i) => i}
          size="small"
          columns={previewColumns}
          dataSource={matched}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ y: 320 }}
        />
      )}

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        Upload history
      </Typography.Title>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={uploads}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        columns={[
          { title: 'Price date', dataIndex: 'date', width: 140 },
          {
            title: 'Quotes',
            dataIndex: 'quotes',
            align: 'right',
            render: (v) => v?.toLocaleString('en-IN'),
          },
          { title: 'Skipped', dataIndex: 'skipped', align: 'right' },
          {
            title: 'Uploaded at',
            dataIndex: 'createdAt',
            render: (v) => (v ? new Date(v).toLocaleString('en-IN') : '—'),
          },
        ]}
        locale={{ emptyText: 'No uploads yet.' }}
      />
    </Space>
  );
}
