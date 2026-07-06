import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Table,
  Form,
  Input,
  Select,
  Button,
  Space,
  Popconfirm,
  Typography,
  Modal,
  Upload,
  Alert,
  Tag,
  Progress,
  message,
} from 'antd';

const client = generateClient();

function pick(row, key) {
  const found = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === key.toLowerCase()
  );
  return found ? String(row[found] ?? '').trim() : '';
}

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

export default function Scripts() {
  const [scripts, setScripts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [importOpen, setImportOpen] = useState(false);
  const [importExchangeId, setImportExchangeId] = useState(null);
  const [importRaw, setImportRaw] = useState([]); // [{ code, isin }]
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clearing, setClearing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      if (!client.models.Script) {
        message.error(
          'Script model not deployed yet. Run "npm run sandbox" to create it.'
        );
        return;
      }
      const [s, c, e] = await Promise.all([
        listAll(client.models.Script),
        listAll(client.models.Company),
        listAll(client.models.Exchange),
      ]);
      setScripts(s);
      setCompanies(c.sort((a, b) => a.name.localeCompare(b.name)));
      setExchanges(e.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      message.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // lookup maps
  const companyById = useMemo(() => {
    const m = {};
    companies.forEach((c) => (m[c.id] = c));
    return m;
  }, [companies]);
  const exchangeById = useMemo(() => {
    const m = {};
    exchanges.forEach((e) => (m[e.id] = e));
    return m;
  }, [exchanges]);

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.ISIN})`,
      })),
    [companies]
  );
  const exchangeOptions = useMemo(
    () => exchanges.map((e) => ({ value: e.id, label: `${e.name} (${e.code})` })),
    [exchanges]
  );

  function openAdd() {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      code: record.code,
      companyId: record.companyId,
      exchangeId: record.exchangeId,
    });
    setFormOpen(true);
  }

  async function submitForm(values) {
    setSaving(true);
    const payload = {
      code: values.code.trim(),
      companyId: values.companyId,
      exchangeId: values.exchangeId,
    };
    const { errors } = editing
      ? await client.models.Script.update({ id: editing.id, ...payload })
      : await client.models.Script.create(payload);
    setSaving(false);
    if (errors) {
      message.error(errors.map((e) => e.message).join(', '));
      return;
    }
    message.success(editing ? 'Script updated' : 'Script added');
    setFormOpen(false);
    load();
  }

  async function remove(id) {
    const { errors } = await client.models.Script.delete({ id });
    if (errors) message.error(errors.map((e) => e.message).join(', '));
    else {
      message.success('Deleted');
      load();
    }
  }

  // ---- CSV import (code, ISIN, exchange) ----------------------------------

  const isinToCompanyId = useMemo(() => {
    const m = {};
    companies.forEach((c) => {
      if (c.ISIN) m[c.ISIN.toLowerCase()] = c.id;
    });
    return m;
  }, [companies]);
  const existingKeys = useMemo(
    () => new Set(scripts.map((s) => `${s.exchangeId}|${(s.code || '').toLowerCase()}`)),
    [scripts]
  );

  // Parse just code + ISIN — the exchange is chosen in the dialog.
  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setImportRaw(
          data.map((raw) => ({ code: pick(raw, 'code'), isin: pick(raw, 'ISIN') }))
        );
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
  }

  // Preview rows derived from the uploaded file + the chosen exchange.
  const rows = useMemo(() => {
    if (!importExchangeId) return [];
    const seen = new Set();
    return importRaw.map(({ code, isin }) => {
      const companyId = isinToCompanyId[isin.toLowerCase()];
      let status = 'ok';
      let reason = '';
      if (!code || !isin) {
        status = 'error';
        reason = 'code and ISIN required';
      } else if (!companyId) {
        status = 'error';
        reason = 'Company ISIN not found';
      } else {
        const key = `${importExchangeId}|${code.toLowerCase()}`;
        if (existingKeys.has(key)) {
          status = 'skip';
          reason = 'Already exists';
        } else if (seen.has(key)) {
          status = 'skip';
          reason = 'Duplicate row in file';
        } else {
          seen.add(key);
        }
      }
      return { code, isin, companyId, exchangeId: importExchangeId, status, reason };
    });
  }, [importRaw, importExchangeId, isinToCompanyId, existingKeys]);

  async function runImport() {
    const toCreate = rows.filter((r) => r.status === 'ok');
    if (toCreate.length === 0) {
      message.info('Nothing to import.');
      return;
    }
    setImporting(true);
    setProgress(0);
    let done = 0;
    let failed = 0;
    for (const r of toCreate) {
      const { errors } = await client.models.Script.create({
        code: r.code,
        companyId: r.companyId,
        exchangeId: r.exchangeId,
      });
      if (errors) failed += 1;
      done += 1;
      setProgress(Math.round((done / toCreate.length) * 100));
    }
    setImporting(false);
    setImportOpen(false);
    setImportRaw([]);
    setImportExchangeId(null);
    if (failed) message.warning(`Imported ${done - failed}, ${failed} failed.`);
    else message.success(`Imported ${done} scripts.`);
    load();
  }

  async function deleteAll() {
    setClearing(true);
    setProgress(0);
    try {
      const all = await listAll(client.models.Script);
      if (all.length === 0) {
        message.info('Nothing to delete.');
        return;
      }
      let done = 0;
      for (const r of all) {
        await client.models.Script.delete({ id: r.id });
        done += 1;
        setProgress(Math.round((done / all.length) * 100));
      }
      message.success(`Deleted ${all.length} scripts.`);
      load();
    } catch (e) {
      message.error(`Delete failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  }

  function downloadTemplate() {
    const csv = 'code,ISIN\nINFY,INE009A01021\nRELIANCE,INE002A01018\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scripts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const skipCount = rows.filter((r) => r.status === 'skip').length;

  // enrich scripts with display names for search + table
  const enriched = useMemo(
    () =>
      scripts.map((s) => ({
        ...s,
        companyName: companyById[s.companyId]?.name ?? '—',
        exchangeCode: exchangeById[s.exchangeId]?.code ?? '—',
      })),
    [scripts, companyById, exchangeById]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (s) =>
        (s.code || '').toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.exchangeCode.toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      sorter: (a, b) => a.code.localeCompare(b.code),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Company',
      dataIndex: 'companyName',
      sorter: (a, b) => a.companyName.localeCompare(b.companyName),
    },
    { title: 'Exchange', dataIndex: 'exchangeCode', width: 120 },
    {
      title: '',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this script?"
            onConfirm={() => remove(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger type="text">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const previewColumns = [
    { title: 'Code', dataIndex: 'code' },
    { title: 'ISIN', dataIndex: 'isin' },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        if (r.status === 'ok') return <Tag color="green">Will import</Tag>;
        if (r.status === 'skip')
          return <Tag color="gold">Skip — {r.reason}</Tag>;
        return <Tag color="red">Error — {r.reason}</Tag>;
      },
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Scripts
        </Typography.Title>
        <Typography.Text type="secondary">{scripts.length} scripts</Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <Input
          allowClear
          placeholder="Search by code, company or exchange"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button
          onClick={() => {
            setImportRaw([]);
            setImportExchangeId(null);
            setImportOpen(true);
          }}
        >
          Import CSV
        </Button>
        {scripts.length > 0 && (
          <Popconfirm
            title={`Delete all ${scripts.length} scripts?`}
            description="This permanently removes every script record."
            onConfirm={deleteAll}
            okText="Delete all"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={clearing}>
              Delete all
            </Button>
          </Popconfirm>
        )}
        <Button type="primary" onClick={openAdd}>
          Add script
        </Button>
      </div>

      {clearing && <Progress percent={progress} />}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{
          defaultPageSize: 25,
          showSizeChanger: true,
          pageSizeOptions: [25, 50, 100, 200],
          showQuickJumper: true,
          showTotal: (total) => `${total} scripts`,
          hideOnSinglePage: true,
        }}
        scroll={{ y: 'calc(100vh - 320px)' }}
        sticky
        locale={{ emptyText: search ? 'No matches.' : 'No scripts yet.' }}
      />

      <Modal
        title={editing ? 'Edit script' : 'Add script'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? 'Save' : 'Add'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitForm}>
          <Form.Item
            name="code"
            label="Code (ticker)"
            rules={[{ required: true, message: 'Code is required' }]}
          >
            <Input placeholder="e.g. INFY" />
          </Form.Item>
          <Form.Item
            name="companyId"
            label="Company"
            rules={[{ required: true, message: 'Company is required' }]}
          >
            <Select
              showSearch
              placeholder="Search company by name or ISIN"
              optionFilterProp="label"
              options={companyOptions}
            />
          </Form.Item>
          <Form.Item
            name="exchangeId"
            label="Exchange"
            rules={[{ required: true, message: 'Exchange is required' }]}
          >
            <Select
              showSearch
              placeholder="Select exchange"
              optionFilterProp="label"
              options={exchangeOptions}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import scripts from CSV"
        open={importOpen}
        onCancel={() => (importing ? null : setImportOpen(false))}
        width={720}
        footer={[
          <Button key="tpl" type="link" onClick={downloadTemplate}>
            Download template
          </Button>,
          <Button
            key="cancel"
            onClick={() => setImportOpen(false)}
            disabled={importing}
          >
            Cancel
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importing}
            disabled={okCount === 0 || !importExchangeId}
            onClick={runImport}
          >
            Import {okCount > 0 ? okCount : ''}
          </Button>,
        ]}
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              placeholder="Select exchange"
              style={{ width: 220 }}
              options={exchangeOptions}
              value={importExchangeId}
              onChange={setImportExchangeId}
            />
            <Upload accept=".csv" showUploadList={false} beforeUpload={handleFile}>
              <Button disabled={!importExchangeId}>
                {importRaw.length ? 'Replace file' : 'Choose CSV'}
              </Button>
            </Upload>
          </div>

          <Alert
            type="info"
            showIcon
            message={
              importExchangeId
                ? `${okCount} to import · ${skipCount} skipped · ${errorCount} errors`
                : 'Pick an exchange, then choose a CSV.'
            }
            description="Columns: code, ISIN. Company is matched by ISIN; the exchange you pick above applies to every row. Duplicate code+exchange rows are skipped."
          />
          {importing && <Progress percent={progress} style={{ marginBottom: 12 }} />}
          <Table
            rowKey={(_, i) => i}
            size="small"
            columns={previewColumns}
            dataSource={rows}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            scroll={{ y: 300 }}
          />
        </Space>
      </Modal>
    </Space>
  );
}
