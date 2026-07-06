import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Table,
  Form,
  Input,
  InputNumber,
  TreeSelect,
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

// Build an antd TreeSelect tree from the flat industry list (by parentId).
function buildIndustryTree(items) {
  const byId = {};
  items.forEach((i) => (byId[i.id] = { value: i.id, title: i.name, children: [] }));
  const roots = [];
  items.forEach((i) => {
    const node = byId[i.id];
    if (i.parentId && byId[i.parentId]) byId[i.parentId].children.push(node);
    else roots.push(node);
  });
  const sort = (ns) => {
    ns.sort((a, b) => a.title.localeCompare(b.title));
    ns.forEach((n) => n.children.length ? sort(n.children) : (n.children = undefined));
  };
  sort(roots);
  return roots;
}

// Pull a value from a parsed CSV row by header name, case-insensitively.
function pick(row, key) {
  const found = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === key.toLowerCase()
  );
  return found ? String(row[found] ?? '').trim() : '';
}

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / edit form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // record being edited, or null
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // CSV import modal
  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch every record of a model, paging through nextToken (~100/page).
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

  async function load() {
    setLoading(true);
    // Companies load on their own — an industry hiccup must not blank the list.
    try {
      const comp = await listAll(client.models.Company);
      setCompanies(comp.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      message.error(`Failed to load companies: ${e.message}`);
    } finally {
      setLoading(false);
    }
    // Industries are only for the picker/column — load separately, best-effort.
    try {
      if (client.models.Industry) {
        setIndustries(await listAll(client.models.Industry));
      }
    } catch (e) {
      // non-fatal: company list still works without industry names
    }
  }

  const industryTree = useMemo(() => buildIndustryTree(industries), [industries]);
  const industryNameById = useMemo(() => {
    const m = {};
    industries.forEach((i) => (m[i.id] = i.name));
    return m;
  }, [industries]);

  useEffect(() => {
    load();
  }, []);

  // ---- add / edit ----------------------------------------------------------

  function openAdd() {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      ISIN: record.ISIN,
      marketCap: record.marketCap ?? undefined,
      industryId: record.industryId ?? undefined,
    });
    setFormOpen(true);
  }

  async function submitForm(values) {
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      ISIN: values.ISIN.trim(),
      marketCap: values.marketCap ?? null,
    };
    // industryId backs an index — omit when empty, send null only to clear.
    if (values.industryId) {
      payload.industryId = values.industryId;
    } else if (editing && editing.industryId) {
      payload.industryId = null;
    }
    const { errors } = editing
      ? await client.models.Company.update({ id: editing.id, ...payload })
      : await client.models.Company.create(payload);
    setSaving(false);
    if (errors) {
      message.error(errors.map((e) => e.message).join(', '));
      return;
    }
    message.success(editing ? 'Company updated' : 'Company added');
    setFormOpen(false);
    load();
  }

  async function remove(id) {
    const { errors } = await client.models.Company.delete({ id });
    if (errors) message.error(errors.map((e) => e.message).join(', '));
    else {
      message.success('Deleted');
      load();
    }
  }

  // ---- CSV import ----------------------------------------------------------

  const existingISINs = useMemo(
    () => new Set(companies.map((c) => (c.ISIN || '').toLowerCase())),
    [companies]
  );

  function parseFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const seen = new Set();
        const parsed = data.map((raw) => {
          const name = pick(raw, 'name');
          const ISIN = pick(raw, 'ISIN');
          const mcRaw = pick(raw, 'marketCap');
          let marketCap = null;
          let status = 'ok';
          let reason = '';

          if (!name || !ISIN) {
            status = 'error';
            reason = 'Name and ISIN are required';
          } else if (mcRaw !== '' && Number.isNaN(Number(mcRaw))) {
            status = 'error';
            reason = 'Market cap must be a number';
          } else if (existingISINs.has(ISIN.toLowerCase())) {
            status = 'skip';
            reason = 'ISIN already exists';
          } else if (seen.has(ISIN.toLowerCase())) {
            status = 'skip';
            reason = 'Duplicate row in file';
          }

          if (mcRaw !== '' && !Number.isNaN(Number(mcRaw))) {
            marketCap = Number(mcRaw);
          }
          if (ISIN) seen.add(ISIN.toLowerCase());

          return { name, ISIN, marketCap, status, reason };
        });
        setRows(parsed);
        setImportOpen(true);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false; // prevent antd Upload from actually uploading
  }

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
      const { errors } = await client.models.Company.create({
        name: r.name,
        ISIN: r.ISIN,
        marketCap: r.marketCap,
      });
      if (errors) failed += 1;
      done += 1;
      setProgress(Math.round((done / toCreate.length) * 100));
    }
    setImporting(false);
    setImportOpen(false);
    setRows([]);
    if (failed) message.warning(`Imported ${done - failed}, ${failed} failed.`);
    else message.success(`Imported ${done} companies.`);
    load();
  }

  function downloadTemplate() {
    const csv = 'name,ISIN,marketCap\nInfosys,INE009A01021,742000\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'companies-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const skipCount = rows.filter((r) => r.status === 'skip').length;

  // ---- list filtering ------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ISIN || '').toLowerCase().includes(q) ||
        (industryNameById[c.industryId] || '').toLowerCase().includes(q)
    );
  }, [companies, search, industryNameById]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'ascend',
    },
    { title: 'ISIN', dataIndex: 'ISIN' },
    {
      title: 'Industry',
      key: 'industry',
      render: (_, r) => industryNameById[r.industryId] || '—',
    },
    {
      title: 'Market cap',
      dataIndex: 'marketCap',
      align: 'right',
      sorter: (a, b) => (a.marketCap ?? 0) - (b.marketCap ?? 0),
      render: (v) => (v == null ? '—' : v.toLocaleString()),
    },
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
            title="Delete this company?"
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
    { title: 'Name', dataIndex: 'name' },
    { title: 'ISIN', dataIndex: 'ISIN' },
    {
      title: 'Market cap',
      dataIndex: 'marketCap',
      align: 'right',
      render: (v) => (v == null ? '—' : v.toLocaleString()),
    },
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
          Companies
        </Typography.Title>
        <Typography.Text type="secondary">
          {companies.length} listed
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <Input
          allowClear
          placeholder="Search by name or ISIN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Upload accept=".csv" showUploadList={false} beforeUpload={parseFile}>
          <Button>Import CSV</Button>
        </Upload>
        <Button type="primary" onClick={openAdd}>
          Add company
        </Button>
      </div>

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
          showTotal: (total) => `${total} companies`,
          hideOnSinglePage: true,
        }}
        scroll={{ y: 'calc(100vh - 320px)' }}
        sticky
        locale={{
          emptyText: search ? 'No matches.' : 'No companies yet.',
        }}
      />

      {/* Add / edit form */}
      <Modal
        title={editing ? 'Edit company' : 'Add company'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? 'Save' : 'Add'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitForm}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Infosys" />
          </Form.Item>
          <Form.Item
            name="ISIN"
            label="ISIN"
            rules={[{ required: true, message: 'ISIN is required' }]}
          >
            <Input placeholder="e.g. INE009A01021" />
          </Form.Item>
          <Form.Item name="industryId" label="Industry">
            <TreeSelect
              allowClear
              showSearch
              treeNodeFilterProp="title"
              placeholder="Select an industry (optional)"
              treeData={industryTree}
              styles={{ popup: { root: { maxHeight: 360, overflow: 'auto' } } }}
            />
          </Form.Item>
          <Form.Item name="marketCap" label="Market cap">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Optional" />
          </Form.Item>
        </Form>
      </Modal>

      {/* CSV import */}
      <Modal
        title="Import companies from CSV"
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
            disabled={okCount === 0}
            onClick={runImport}
          >
            Import {okCount > 0 ? okCount : ''}
          </Button>,
        ]}
      >
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message={`${okCount} to import · ${skipCount} skipped · ${errorCount} errors`}
          description="Expected columns: name, ISIN, marketCap (marketCap optional). Rows with errors or duplicate ISINs are excluded."
        />
        {importing && (
          <Progress percent={progress} style={{ marginBottom: 12 }} />
        )}
        <Table
          rowKey={(_, i) => i}
          size="small"
          columns={previewColumns}
          dataSource={rows}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          scroll={{ y: 300 }}
        />
      </Modal>
    </Space>
  );
}
