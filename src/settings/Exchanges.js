import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Table,
  Form,
  Input,
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

export default function Exchanges() {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clearing, setClearing] = useState(false);

  async function listAll() {
    let all = [];
    let nextToken = null;
    do {
      const { data, nextToken: nt, errors } =
        await client.models.Exchange.list({ limit: 1000, nextToken });
      if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      all = all.concat(data);
      nextToken = nt;
    } while (nextToken);
    return all;
  }

  async function load() {
    setLoading(true);
    try {
      if (!client.models.Exchange) {
        message.error(
          'Exchange model not deployed yet. Run "npm run sandbox" to create it.'
        );
        return;
      }
      const all = await listAll();
      setExchanges(all.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      message.error(`Failed to load exchanges: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({ name: record.name, code: record.code });
    setFormOpen(true);
  }

  async function submitForm(values) {
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      code: values.code.trim(),
    };
    const { errors } = editing
      ? await client.models.Exchange.update({ id: editing.id, ...payload })
      : await client.models.Exchange.create(payload);
    setSaving(false);
    if (errors) {
      message.error(errors.map((e) => e.message).join(', '));
      return;
    }
    message.success(editing ? 'Exchange updated' : 'Exchange added');
    setFormOpen(false);
    load();
  }

  async function remove(id) {
    const { errors } = await client.models.Exchange.delete({ id });
    if (errors) message.error(errors.map((e) => e.message).join(', '));
    else {
      message.success('Deleted');
      load();
    }
  }

  // ---- CSV import (dedupe by code) ----------------------------------------

  const existingCodes = useMemo(
    () => new Set(exchanges.map((e) => (e.code || '').toLowerCase())),
    [exchanges]
  );

  function parseFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const seen = new Set();
        const parsed = data.map((raw) => {
          const name = pick(raw, 'name');
          const code = pick(raw, 'code');
          let status = 'ok';
          let reason = '';

          if (!name || !code) {
            status = 'error';
            reason = 'Name and code are required';
          } else if (existingCodes.has(code.toLowerCase())) {
            status = 'skip';
            reason = 'Code already exists';
          } else if (seen.has(code.toLowerCase())) {
            status = 'skip';
            reason = 'Duplicate row in file';
          }
          if (code) seen.add(code.toLowerCase());

          return { name, code, status, reason };
        });
        setRows(parsed);
        setImportOpen(true);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
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
      const { errors } = await client.models.Exchange.create({
        name: r.name,
        code: r.code,
      });
      if (errors) failed += 1;
      done += 1;
      setProgress(Math.round((done / toCreate.length) * 100));
    }
    setImporting(false);
    setImportOpen(false);
    setRows([]);
    if (failed) message.warning(`Imported ${done - failed}, ${failed} failed.`);
    else message.success(`Imported ${done} exchanges.`);
    load();
  }

  async function deleteAll() {
    setClearing(true);
    setProgress(0);
    try {
      const all = await listAll();
      if (all.length === 0) {
        message.info('Nothing to delete.');
        return;
      }
      let done = 0;
      for (const r of all) {
        await client.models.Exchange.delete({ id: r.id });
        done += 1;
        setProgress(Math.round((done / all.length) * 100));
      }
      message.success(`Deleted ${all.length} exchanges.`);
      load();
    } catch (e) {
      message.error(`Delete failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  }

  function downloadTemplate() {
    const csv = 'name,code\nNational Stock Exchange,NSE\nBSE,BSE\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exchanges-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const skipCount = rows.filter((r) => r.status === 'skip').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exchanges;
    return exchanges.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.code || '').toLowerCase().includes(q)
    );
  }, [exchanges, search]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'ascend',
    },
    { title: 'Code', dataIndex: 'code' },
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
            title="Delete this exchange?"
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
    { title: 'Code', dataIndex: 'code' },
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
          Exchanges
        </Typography.Title>
        <Typography.Text type="secondary">
          {exchanges.length} exchanges
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <Input
          allowClear
          placeholder="Search by name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Upload accept=".csv" showUploadList={false} beforeUpload={parseFile}>
          <Button>Import CSV</Button>
        </Upload>
        {exchanges.length > 0 && (
          <Popconfirm
            title={`Delete all ${exchanges.length} exchanges?`}
            description="This permanently removes every exchange record."
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
          Add exchange
        </Button>
      </div>

      {clearing && <Progress percent={progress} />}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        locale={{ emptyText: search ? 'No matches.' : 'No exchanges yet.' }}
      />

      <Modal
        title={editing ? 'Edit exchange' : 'Add exchange'}
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
            <Input placeholder="e.g. National Stock Exchange" />
          </Form.Item>
          <Form.Item
            name="code"
            label="Code"
            rules={[{ required: true, message: 'Code is required' }]}
          >
            <Input placeholder="e.g. NSE" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import exchanges from CSV"
        open={importOpen}
        onCancel={() => (importing ? null : setImportOpen(false))}
        width={640}
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
          description="Expected columns: name, code (both required). Duplicate codes are skipped."
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
