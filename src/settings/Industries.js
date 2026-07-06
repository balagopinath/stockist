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
  TreeSelect,
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

// Build a parent→children tree from a flat list (linked by parentId).
function buildTree(items) {
  const byId = {};
  items.forEach((i) => {
    byId[i.id] = { ...i, children: [] };
  });
  const roots = [];
  items.forEach((i) => {
    if (i.parentId && byId[i.parentId]) byId[i.parentId].children.push(byId[i.id]);
    else roots.push(byId[i.id]);
  });
  const sortRec = (nodes) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => {
      if (n.children.length) sortRec(n.children);
      else delete n.children; // no expander on leaves
    });
  };
  sortRec(roots);
  return roots;
}

// All descendant ids of a node (so we can't make a node its own ancestor).
function descendantIds(items, id) {
  const out = new Set();
  const walk = (pid) => {
    items
      .filter((i) => i.parentId === pid)
      .forEach((c) => {
        out.add(c.id);
        walk(c.id);
      });
  };
  walk(id);
  return out;
}

// Convert tree nodes to antd TreeSelect data, dropping excluded subtrees.
function toTreeSelect(nodes, exclude) {
  return (nodes || [])
    .filter((n) => !exclude.has(n.id))
    .map((n) => ({
      title: n.code ? `${n.name} (${n.code})` : n.name,
      value: n.id,
      children: toTreeSelect(n.children, exclude),
    }));
}

export default function Industries() {
  const [industries, setIndustries] = useState([]);
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

  // Fetch every record, paging through nextToken (list() returns ~100/page).
  async function listAll() {
    let all = [];
    let nextToken = null;
    do {
      const { data, nextToken: nt, errors } =
        await client.models.Industry.list({ limit: 1000, nextToken });
      if (errors) throw new Error(errors.map((e) => e.message).join(', '));
      all = all.concat(data);
      nextToken = nt;
    } while (nextToken);
    return all;
  }

  async function load() {
    setLoading(true);
    try {
      if (!client.models.Industry) {
        message.error(
          'Industry model not deployed yet. Run "npm run sandbox" to create it.'
        );
        return;
      }
      setIndustries(await listAll());
    } catch (e) {
      message.error(`Failed to load industries: ${e.message}`);
    } finally {
      setLoading(false);
    }
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
        await client.models.Industry.delete({ id: r.id });
        done += 1;
        setProgress(Math.round((done / all.length) * 100));
      }
      message.success(`Deleted ${all.length} industries.`);
      load();
    } catch (e) {
      message.error(`Delete failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Backfill/repair the stored `level` on every industry from its parent chain.
  // Only writes rows whose stored level is wrong (or missing).
  async function recomputeLevels() {
    setClearing(true);
    setProgress(0);
    try {
      const all = await listAll();
      const map = Object.fromEntries(all.map((i) => [i.id, i]));
      const depth = (i) => {
        let d = 0;
        let cur = i;
        let guard = 0;
        while (cur && cur.parentId && guard++ < 20) {
          cur = map[cur.parentId];
          d += 1;
        }
        return d;
      };
      // null level (never set) always needs writing — including roots (level 0)
      const stale = all.filter((i) => i.level == null || Number(i.level) !== depth(i));
      if (stale.length === 0) {
        message.success('All levels are already correct.');
        return;
      }
      let done = 0;
      let failed = 0;
      let firstErr = '';
      for (const i of stale) {
        const { errors } = await client.models.Industry.update({
          id: i.id,
          level: depth(i),
        });
        if (errors) {
          failed += 1;
          if (!firstErr) firstErr = errors.map((e) => e.message).join(', ');
        }
        done += 1;
        setProgress(Math.round((done / stale.length) * 100));
      }
      if (failed) {
        message.error(`Updated ${done - failed}, ${failed} failed: ${firstErr}`);
      } else {
        message.success(`Updated level on ${done} industries.`);
      }
      load();
    } catch (e) {
      message.error(`Recompute failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  }

  const tree = useMemo(() => buildTree(industries), [industries]);

  const nameById = useMemo(() => {
    const m = {};
    industries.forEach((i) => (m[i.id] = i.name));
    return m;
  }, [industries]);

  const byId = useMemo(
    () => Object.fromEntries(industries.map((i) => [i.id, i])),
    [industries]
  );

  // level = number of ancestors (root = 0), derived from the parent chain
  const levelForParent = (parentId) => {
    if (!parentId) return 0;
    let lvl = 1;
    let cur = byId[parentId];
    let guard = 0;
    while (cur && cur.parentId && guard++ < 20) {
      cur = byId[cur.parentId];
      lvl += 1;
    }
    return lvl;
  };

  const parentTreeData = useMemo(() => {
    const exclude = editing
      ? new Set([editing.id, ...descendantIds(industries, editing.id)])
      : new Set();
    return toTreeSelect(tree, exclude);
  }, [tree, industries, editing]);

  function openAdd(parentId = null) {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ parentId: parentId ?? undefined });
    setFormOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code ?? '',
      parentId: record.parentId ?? undefined,
    });
    setFormOpen(true);
  }

  async function submitForm(values) {
    setSaving(true);
    // parentId backs a secondary index, so it can't be written as NULL.
    // Omit it for top-level rows; only send null when clearing an existing
    // parent (moving a sub-industry back to the top).
    const payload = {
      name: values.name.trim(),
      code: values.code?.trim() || null,
      level: levelForParent(values.parentId),
    };
    if (values.parentId) {
      payload.parentId = values.parentId;
    } else if (editing && editing.parentId) {
      payload.parentId = null;
    }
    const { errors } = editing
      ? await client.models.Industry.update({ id: editing.id, ...payload })
      : await client.models.Industry.create(payload);
    setSaving(false);
    if (errors) {
      message.error(errors.map((e) => e.message).join(', '));
      return;
    }
    message.success(editing ? 'Industry updated' : 'Industry added');
    setFormOpen(false);
    load();
  }

  async function remove(record) {
    const hasChildren = industries.some((i) => i.parentId === record.id);
    if (hasChildren) {
      message.warning(
        'This industry has sub-industries. Reassign or delete them first.'
      );
      return;
    }
    const { errors } = await client.models.Industry.delete({ id: record.id });
    if (errors) message.error(errors.map((e) => e.message).join(', '));
    else {
      message.success('Deleted');
      load();
    }
  }

  // ---- CSV import (name, level, parent) -----------------------------------

  // Rows are interpreted by ORDER + LEVEL: each row's parent is the most
  // recent row one level shallower. This handles names that repeat across
  // branches and "self-named" leaves (e.g. an industry whose only basic
  // industry shares its name). The file must list each parent before its
  // children (a normal depth-first export, like the NSE classification).
  function parseFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const namePath = []; // namePath[level] = name on the current branch
        const seenKeys = new Set();

        const parsed = data.map((raw) => {
          const name = pick(raw, 'name');
          const levelRaw = pick(raw, 'level');
          const code = pick(raw, 'code');
          let parent = pick(raw, 'parent');
          const level = parseInt(levelRaw, 10);
          let status = 'ok';
          let reason = '';

          if (!name) {
            status = 'error';
            reason = 'Name is required';
          } else if (levelRaw === '' || Number.isNaN(level) || level < 0) {
            status = 'error';
            reason = 'Level must be 0 or greater';
          } else if (level === 0) {
            parent = ''; // top-level rows have no parent
          } else if (namePath[level - 1] === undefined) {
            status = 'error';
            reason = `No parent row at level ${level - 1} above this one`;
          } else if (
            parent &&
            parent.toLowerCase() !== namePath[level - 1].toLowerCase()
          ) {
            status = 'error';
            reason = `Parent should be "${namePath[level - 1]}"`;
          }

          if (status === 'ok') {
            namePath[level] = name;
            namePath.length = level + 1;
            const key = (
              (level > 0 ? namePath[level - 1] : '') +
              ' > ' +
              name
            ).toLowerCase();
            if (seenKeys.has(key)) {
              status = 'skip';
              reason = 'Duplicate row in file';
            } else {
              seenKeys.add(key);
            }
          }

          return {
            name,
            level: Number.isNaN(level) ? '' : level,
            parent,
            code: code || null,
            status,
            reason,
          };
        });

        setRows(parsed);
        setImportOpen(true);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
  }

  async function runImport() {
    // Keep original file order — parent resolution depends on it.
    const okRows = rows.filter((r) => r.status === 'ok');
    if (okRows.length === 0) {
      message.info('Nothing to import.');
      return;
    }
    setImporting(true);
    setProgress(0);

    const idPath = []; // idPath[level] = id of the current node at that level
    let done = 0;
    let failed = 0;
    for (const r of okRows) {
      const payload = { name: r.name, code: r.code, level: r.level };
      const parentId = r.level > 0 ? idPath[r.level - 1] : undefined;
      if (parentId) payload.parentId = parentId; // omit for roots (null not allowed on index)
      const { data, errors } = await client.models.Industry.create(payload);
      if (errors || !data) {
        failed += 1;
      } else {
        idPath[r.level] = data.id;
        idPath.length = r.level + 1;
      }
      done += 1;
      setProgress(Math.round((done / okRows.length) * 100));
    }

    setImporting(false);
    setImportOpen(false);
    setRows([]);
    if (failed) message.warning(`Imported ${done - failed}, ${failed} failed.`);
    else message.success(`Imported ${done} industries.`);
    load();
  }

  function downloadTemplate() {
    const csv =
      'name,level,parent\n' +
      'Financials,0,\n' +
      'Banks,1,Financials\n' +
      'Private Sector Banks,2,Banks\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'industries-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const skipCount = rows.filter((r) => r.status === 'skip').length;

  // ---- list (tree, or flat when searching) --------------------------------

  const searching = search.trim().length > 0;
  const filteredFlat = useMemo(() => {
    const q = search.trim().toLowerCase();
    return industries
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.code || '').toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [industries, search]);

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Level', dataIndex: 'level', width: 70, render: (v) => (v == null ? '—' : v) },
    { title: 'Code', dataIndex: 'code', render: (v) => v || '—' },
    ...(searching
      ? [
          {
            title: 'Parent',
            key: 'parent',
            render: (_, r) => (r.parentId ? nameById[r.parentId] : '—'),
          },
        ]
      : []),
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {!searching && (
            <Button
              size="small"
              type="link"
              onClick={() => openAdd(record.id)}
            >
              Add sub
            </Button>
          )}
          <Button size="small" type="link" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this industry?"
            onConfirm={() => remove(record)}
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
    { title: 'Level', dataIndex: 'level', width: 70 },
    { title: 'Parent', dataIndex: 'parent', render: (v) => v || '—' },
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
          Industries
        </Typography.Title>
        <Typography.Text type="secondary">
          {industries.length} industries
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
        {industries.length > 0 && (
          <Button onClick={recomputeLevels} loading={clearing}>
            Fix levels
          </Button>
        )}
        {industries.length > 0 && (
          <Popconfirm
            title={`Delete all ${industries.length} industries?`}
            description="This permanently removes every industry record."
            onConfirm={deleteAll}
            okText="Delete all"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={clearing}>
              Delete all
            </Button>
          </Popconfirm>
        )}
        <Button type="primary" onClick={() => openAdd(null)}>
          Add industry
        </Button>
      </div>

      {clearing && <Progress percent={progress} />}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={searching ? filteredFlat : tree}
        pagination={
          searching
            ? { pageSize: 20, showSizeChanger: true, hideOnSinglePage: true }
            : false
        }
        expandable={searching ? {} : { defaultExpandAllRows: true }}
        scroll={{ y: 'calc(100vh - 320px)' }}
        sticky
        locale={{ emptyText: searching ? 'No matches.' : 'No industries yet.' }}
      />

      {/* Add / edit */}
      <Modal
        title={editing ? 'Edit industry' : 'Add industry'}
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
            <Input placeholder="e.g. Banks" />
          </Form.Item>
          <Form.Item name="code" label="Code">
            <Input placeholder="e.g. BANK (optional)" />
          </Form.Item>
          <Form.Item
            name="parentId"
            label="Parent industry"
            tooltip="Leave empty for a top-level industry"
          >
            <TreeSelect
              allowClear
              treeDefaultExpandAll
              placeholder="No parent (top level)"
              treeData={parentTreeData}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* CSV import */}
      <Modal
        title="Import industries from CSV"
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
          description="Columns: name, level, parent. Level 0 = top level. Each parent must appear above its children (depth-first order). Repeated names across branches are fine."
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
