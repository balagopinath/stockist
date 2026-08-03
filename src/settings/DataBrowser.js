import { useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import {
  Typography,
  Space,
  Select,
  Input,
  Button,
  Table,
  Modal,
  Popconfirm,
  Tag,
  Alert,
  message,
} from 'antd';

const client = generateClient();

// fields the backend manages — not sent on create/update
const READONLY = ['__typename', 'createdAt', 'updatedAt'];

const OPS = [
  { label: '=', value: 'eq' },
  { label: '≠', value: 'ne' },
  { label: '>', value: 'gt' },
  { label: '≥', value: 'ge' },
  { label: '<', value: 'lt' },
  { label: '≤', value: 'le' },
  { label: 'contains', value: 'contains' },
  { label: 'begins with', value: 'beginsWith' },
];

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

const coerce = (v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
};

const cell = (v) => {
  if (v == null) return <span style={{ color: '#bbb' }}>—</span>;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const stripReadonly = (obj) => {
  const o = { ...obj };
  READONLY.forEach((k) => delete o[k]);
  return o;
};

export default function DataBrowser() {
  const modelNames = useMemo(
    () => Object.keys(client.models || {}).sort(),
    []
  );
  const [model, setModel] = useState(null);
  const [field, setField] = useState('');
  const [op, setOp] = useState('eq');
  const [value, setValue] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const [editRec, setEditRec] = useState(null); // { id, text }
  const [createOpen, setCreateOpen] = useState(false);
  const [createText, setCreateText] = useState('{\n  \n}');
  const [saving, setSaving] = useState(false);

  async function run() {
    if (!model || !client.models[model]) return message.error('Pick a model.');
    setLoading(true);
    setRan(true);
    try {
      const filter = field && value !== '' ? { [field.trim()]: { [op]: coerce(value) } } : null;
      setRows(await listAll(client.models[model], filter));
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  // union of keys across the fetched rows → columns
  const fieldKeys = useMemo(() => {
    const keys = [];
    const seen = new Set();
    rows.forEach((r) =>
      Object.keys(r).forEach((k) => {
        if (!seen.has(k) && !READONLY.includes(k)) {
          seen.add(k);
          keys.push(k);
        }
      })
    );
    // id first
    return ['id', ...keys.filter((k) => k !== 'id')].filter((k) => seen.has(k) || k === 'id');
  }, [rows]);

  const columns = useMemo(() => {
    const cols = fieldKeys.map((k) => ({
      title: k,
      dataIndex: k,
      ellipsis: true,
      width: k === 'id' ? 220 : undefined,
      render: cell,
    }));
    cols.push({
      title: '',
      key: '_act',
      fixed: 'right',
      width: 130,
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={() => setEditRec({ id: r.id, text: JSON.stringify(r, null, 2) })}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this record?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(r.id)}
          >
            <Button size="small" type="text" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    });
    return cols;
  }, [fieldKeys]);

  async function remove(id) {
    try {
      const { errors } = await client.models[model].delete({ id });
      if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      message.success('Deleted');
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      message.error(e.message);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const obj = stripReadonly(JSON.parse(editRec.text));
      if (!obj.id) throw new Error('The record must keep its "id".');
      const { data, errors } = await client.models[model].update(obj);
      if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      message.success('Saved');
      setRows((rs) => rs.map((r) => (r.id === data.id ? data : r)));
      setEditRec(null);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveCreate() {
    setSaving(true);
    try {
      const obj = stripReadonly(JSON.parse(createText));
      delete obj.id;
      const { data, errors } = await client.models[model].create(obj);
      if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      message.success('Created');
      setRows((rs) => [data, ...rs]);
      setCreateOpen(false);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Data browser
        </Typography.Title>
        <Typography.Text type="secondary">
          Inspect and fix records directly. This is DynamoDB (not SQL) — filter by a
          field, then edit/delete/create individual records. Use with care.
        </Typography.Text>
      </div>

      <Space wrap>
        <Select
          showSearch
          style={{ minWidth: 220 }}
          placeholder="Model / table"
          value={model}
          onChange={(v) => {
            setModel(v);
            setRows([]);
            setRan(false);
            setField('');
            setValue('');
          }}
          options={modelNames.map((n) => ({ label: n, value: n }))}
        />
        <Input
          style={{ width: 160 }}
          placeholder="field (optional)"
          value={field}
          onChange={(e) => setField(e.target.value)}
        />
        <Select style={{ width: 120 }} value={op} onChange={setOp} options={OPS} />
        <Input
          style={{ width: 180 }}
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPressEnter={run}
        />
        <Button type="primary" loading={loading} disabled={!model} onClick={run}>
          Run
        </Button>
        <Button
          disabled={!model}
          onClick={() => {
            setCreateText('{\n  \n}');
            setCreateOpen(true);
          }}
        >
          New record
        </Button>
      </Space>

      {ran && (
        <Typography.Text type="secondary">
          {rows.length} record(s){field && value !== '' ? ` where ${field} ${op} ${value}` : ''}
        </Typography.Text>
      )}

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 25, showSizeChanger: true }}
        scroll={{ x: 'max-content', y: 'calc(100vh - 340px)' }}
        locale={{ emptyText: ran ? 'No records.' : 'Pick a model and click Run.' }}
      />

      {/* Edit record */}
      <Modal
        title="Edit record"
        open={!!editRec}
        onCancel={() => setEditRec(null)}
        onOk={saveEdit}
        okText="Save"
        okButtonProps={{ loading: saving }}
        width={640}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          message="Keep the id. Read-only fields (createdAt, updatedAt) are ignored on save."
        />
        <Input.TextArea
          rows={16}
          value={editRec?.text}
          onChange={(e) => setEditRec((p) => ({ ...p, text: e.target.value }))}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>

      {/* Create record */}
      <Modal
        title={`New ${model || ''} record`}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={saveCreate}
        okText="Create"
        okButtonProps={{ loading: saving }}
        width={640}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Enter the record as JSON (no id — it's generated).
        </Typography.Paragraph>
        <Input.TextArea
          rows={14}
          value={createText}
          onChange={(e) => setCreateText(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </Space>
  );
}
