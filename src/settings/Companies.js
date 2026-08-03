import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import Papa from 'papaparse';
import {
  Table,
  Form,
  Input,
  InputNumber,
  TreeSelect,
  Select,
  Segmented,
  Button,
  Space,
  Popconfirm,
  Typography,
  Modal,
  Card,
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

  // CSV update-only import (matches by ISIN, updates industry + market cap)
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateRows, setUpdateRows] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // CSV export modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState('ALL'); // ALL | NO_INDUSTRY | NO_MARKETCAP
  const [includeScript, setIncludeScript] = useState('NO'); // NO | YES
  const [exportExchangeId, setExportExchangeId] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

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

  // ---- watcher data --------------------------------------------------------
  const industryById = useMemo(
    () => Object.fromEntries(industries.map((i) => [i.id, i])),
    [industries]
  );
  const industryHasChildren = useMemo(
    () => new Set(industries.filter((i) => i.parentId).map((i) => i.parentId)),
    [industries]
  );
  // depth from root (0-based); shown as level = depth + 1 (Basic Industry = 4)
  const industryDepth = (id) => {
    let d = 0;
    let cur = industryById[id];
    let g = 0;
    while (cur && cur.parentId && g++ < 20) {
      cur = industryById[cur.parentId];
      d += 1;
    }
    return d;
  };

  const noIndustryCompanies = useMemo(
    () => companies.filter((c) => !c.industryId),
    [companies]
  );

  // companies whose industry is NOT a Basic Industry (leaf) — i.e. attached to
  // a higher level (1/2/3) that still has sub-industries below it
  const wrongLevelCompanies = useMemo(() => {
    return companies
      .filter((c) => c.industryId && industryById[c.industryId])
      .map((c) => {
        const ind = industryById[c.industryId];
        const isLeaf = !industryHasChildren.has(ind.id);
        if (isLeaf) return null;
        return {
          id: c.id,
          name: c.name,
          industryName: ind.name,
          level: industryDepth(ind.id) + 1,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, industryById, industryHasChildren]);

  useEffect(() => {
    load();
  }, []);

  // ---- add / edit ----------------------------------------------------------

  function openAdd() {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  }

  function editById(id) {
    const c = companies.find((x) => x.id === id);
    if (c) openEdit(c);
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

  // ---- update-only CSV (industry + market cap) ----------------------------

  // industry name → id, preferring leaf (Basic Industry) nodes on name clashes
  const industryIdByName = useMemo(() => {
    const hasChild = new Set(industries.filter((i) => i.parentId).map((i) => i.parentId));
    const m = {};
    industries
      .filter((i) => hasChild.has(i.id))
      .forEach((i) => {
        const k = i.name.trim().toLowerCase();
        if (m[k] === undefined) m[k] = i.id;
      });
    industries
      .filter((i) => !hasChild.has(i.id))
      .forEach((i) => (m[i.name.trim().toLowerCase()] = i.id));
    return m;
  }, [industries]);

  const companyByISIN = useMemo(() => {
    const m = {};
    companies.forEach((c) => (m[(c.ISIN || '').toLowerCase()] = c));
    return m;
  }, [companies]);

  function parseUpdateFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data.map((raw) => {
          const name = pick(raw, 'name');
          const ISIN = pick(raw, 'ISIN');
          const basic = pick(raw, 'basicIndustry');
          const industryTxt = pick(raw, 'industry');
          const mcRaw = pick(raw, 'marketCap');
          const company = ISIN ? companyByISIN[ISIN.toLowerCase()] : null;

          const wantName = (basic || industryTxt || '').trim();
          const industryId = wantName ? industryIdByName[wantName.toLowerCase()] : undefined;
          const marketCap =
            mcRaw !== '' && !Number.isNaN(Number(mcRaw)) ? Number(mcRaw) : null;

          let status = 'update';
          let reason = '';
          if (!ISIN) {
            status = 'error';
            reason = 'ISIN missing';
          } else if (!company) {
            status = 'skip';
            reason = 'No company with this ISIN';
          } else if (marketCap == null && !wantName) {
            status = 'nochange';
            reason = 'Nothing to update';
          } else if (wantName && industryId === undefined) {
            // industry name not found — still update market cap if present
            status = marketCap != null ? 'update' : 'warn';
            reason = `Industry not found: ${wantName}`;
          }

          return {
            name: company?.name || name,
            ISIN,
            companyId: company?.id || null,
            industryId,
            industryName: wantName,
            marketCap,
            status,
            reason,
          };
        });
        setUpdateRows(parsed);
        setUpdateOpen(true);
      },
      error: (err) => message.error(`Could not read file: ${err.message}`),
    });
    return false;
  }

  async function runUpdate() {
    const toUpdate = updateRows.filter((r) => r.status === 'update' && r.companyId);
    if (toUpdate.length === 0) return message.info('Nothing to update.');
    setUpdating(true);
    setUpdateProgress(0);
    let done = 0;
    let failed = 0;
    for (const r of toUpdate) {
      const payload = { id: r.companyId };
      if (r.marketCap != null) payload.marketCap = r.marketCap;
      if (r.industryId) payload.industryId = r.industryId; // never clears an existing one
      if (Object.keys(payload).length > 1) {
        const { errors } = await client.models.Company.update(payload);
        if (errors) failed += 1;
      }
      done += 1;
      setUpdateProgress(Math.round((done / toUpdate.length) * 100));
    }
    setUpdating(false);
    setUpdateOpen(false);
    setUpdateRows([]);
    if (failed) message.warning(`Updated ${done - failed}, ${failed} failed.`);
    else message.success(`Updated ${done} companies.`);
    load();
  }

  const updCounts = useMemo(() => {
    const c = { update: 0, skip: 0, nochange: 0, warn: 0, error: 0 };
    updateRows.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [updateRows]);

  // companies to export = search-filtered list narrowed by the chosen scope
  // (a function so it reads `filtered` at call time, not during render)
  function scopedExportList() {
    if (exportScope === 'NO_INDUSTRY') return filtered.filter((c) => !c.industryId);
    if (exportScope === 'NO_MARKETCAP') return filtered.filter((c) => c.marketCap == null);
    return filtered;
  }

  async function openExport() {
    setExportScope('ALL');
    setIncludeScript('NO');
    setExportExchangeId(null);
    setExportOpen(true);
    // lazily load exchanges + scripts the first time
    if (exchanges.length === 0 || scripts.length === 0) {
      setExportLoading(true);
      try {
        const [ex, sc] = await Promise.all([
          client.models.Exchange ? listAll(client.models.Exchange) : [],
          client.models.Script ? listAll(client.models.Script) : [],
        ]);
        setExchanges(ex.sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name)));
        setScripts(sc);
      } catch (e) {
        message.error(`Couldn't load scripts: ${e.message}`);
      } finally {
        setExportLoading(false);
      }
    }
  }

  function runExport() {
    if (includeScript === 'YES' && !exportExchangeId) {
      return message.error('Pick an exchange, or set “Include script code” to No.');
    }
    const ex = exchanges.find((e) => e.id === exportExchangeId);
    const codeCol = ex ? `${ex.code || ex.name} code` : 'scriptCode';
    // company -> code for the chosen exchange
    const codeByCompany = {};
    if (includeScript === 'YES' && exportExchangeId) {
      scripts.forEach((s) => {
        if (s.exchangeId === exportExchangeId) codeByCompany[s.companyId] = s.code;
      });
    }
    const data = scopedExportList().map((c) => {
      const row = {
        name: c.name,
        ISIN: c.ISIN,
        industry: industryNameById[c.industryId] || '',
        marketCap: c.marketCap ?? '',
      };
      if (includeScript === 'YES') row[codeCol] = codeByCompany[c.id] || '';
      return row;
    });
    if (data.length === 0) return message.info('Nothing to export for this filter.');
    const csv = Papa.unparse(data);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
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
        <Upload accept=".csv" showUploadList={false} beforeUpload={parseUpdateFile}>
          <Button>Update CSV</Button>
        </Upload>
        <Button onClick={openExport} disabled={filtered.length === 0}>
          Export CSV
        </Button>
        <Button type="primary" onClick={openAdd}>
          Add company
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
            locale={{ emptyText: search ? 'No matches.' : 'No companies yet.' }}
          />
        </div>

        {/* fixed watcher panel */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Card
            size="small"
            title={`No industry (${noIndustryCompanies.length})`}
            styles={{ body: { padding: 0, maxHeight: 'calc(50vh - 140px)', overflow: 'auto' } }}
          >
            {noIndustryCompanies.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#3f8600' }}>
                ✓ All companies have an industry
              </div>
            ) : (
              <Table
                rowKey="id"
                size="small"
                pagination={{ pageSize: 15, hideOnSinglePage: true, simple: true }}
                dataSource={noIndustryCompanies}
                columns={[
                  {
                    title: 'Company',
                    dataIndex: 'name',
                    ellipsis: true,
                    render: (v, r) => (
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => openEdit(r)}
                      >
                        {v}
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Card>

          <Card
            size="small"
            title={`Not Basic Industry (${wrongLevelCompanies.length})`}
            styles={{ body: { padding: 0, maxHeight: 'calc(50vh - 120px)', overflow: 'auto' } }}
          >
            {wrongLevelCompanies.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#3f8600' }}>
                ✓ All are at Basic Industry level
              </div>
            ) : (
              <Table
                rowKey="id"
                size="small"
                pagination={{ pageSize: 15, hideOnSinglePage: true, simple: true }}
                dataSource={wrongLevelCompanies}
                columns={[
                  {
                    title: 'Company',
                    dataIndex: 'name',
                    ellipsis: true,
                    render: (v, r) => (
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => editById(r.id)}
                      >
                        {v}
                      </Button>
                    ),
                  },
                  {
                    title: 'Industry',
                    dataIndex: 'industryName',
                    ellipsis: true,
                    render: (v, r) => (
                      <span>
                        <Tag color="orange">L{r.level}</Tag>
                        {v}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </div>
      </div>

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

      {/* Update-only CSV (industry + market cap) */}
      <Modal
        title="Update companies (industry & market cap)"
        open={updateOpen}
        onCancel={() => (updating ? null : setUpdateOpen(false))}
        width={780}
        footer={[
          <Button key="cancel" onClick={() => setUpdateOpen(false)} disabled={updating}>
            Cancel
          </Button>,
          <Button
            key="apply"
            type="primary"
            loading={updating}
            disabled={updCounts.update === 0}
            onClick={runUpdate}
          >
            Apply {updCounts.update > 0 ? updCounts.update : ''} update(s)
          </Button>,
        ]}
      >
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message={`${updCounts.update} to update · ${updCounts.nochange} unchanged · ${updCounts.skip} not found · ${updCounts.warn} industry-not-found · ${updCounts.error} errors`}
          description="Matches existing companies by ISIN and updates only their market cap and industry (from the basicIndustry column). No company is created or deleted; a blank industry never clears an existing one."
        />
        {updating && <Progress percent={updateProgress} style={{ marginBottom: 12 }} />}
        <Table
          rowKey={(_, i) => i}
          size="small"
          dataSource={updateRows}
          pagination={{ pageSize: 8, showSizeChanger: true }}
          scroll={{ y: 320 }}
          columns={[
            { title: 'Name', dataIndex: 'name', ellipsis: true },
            { title: 'ISIN', dataIndex: 'ISIN', width: 140 },
            {
              title: 'Industry',
              key: 'ind',
              render: (_, r) =>
                r.industryName ? (
                  r.industryId ? (
                    r.industryName
                  ) : (
                    <span style={{ color: '#cf1322' }}>{r.industryName} (not found)</span>
                  )
                ) : (
                  '—'
                ),
            },
            {
              title: 'Market cap',
              dataIndex: 'marketCap',
              align: 'right',
              width: 130,
              render: (v) => (v == null ? '—' : v.toLocaleString()),
            },
            {
              title: 'Status',
              key: 'status',
              width: 150,
              render: (_, r) => {
                if (r.status === 'update') return <Tag color="green">Will update</Tag>;
                if (r.status === 'warn') return <Tag color="orange">{r.reason}</Tag>;
                if (r.status === 'nochange') return <Tag>Unchanged</Tag>;
                if (r.status === 'skip') return <Tag color="gold">Skip — {r.reason}</Tag>;
                return <Tag color="red">{r.reason}</Tag>;
              },
            },
          ]}
        />
      </Modal>

      {/* CSV export */}
      <Modal
        title="Export companies to CSV"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={runExport}
        okText="Export"
        okButtonProps={{ loading: exportLoading }}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          <div>
            <div style={{ marginBottom: 4 }}>Which companies?</div>
            <Segmented
              value={exportScope}
              onChange={setExportScope}
              options={[
                { label: 'All', value: 'ALL' },
                { label: 'No industry', value: 'NO_INDUSTRY' },
                { label: 'No market cap', value: 'NO_MARKETCAP' },
              ]}
            />
          </div>
          <Typography.Text type="secondary">
            {scopedExportList().length} compan
            {scopedExportList().length === 1 ? 'y' : 'ies'} will be exported (columns: name, ISIN,
            industry, market cap).
          </Typography.Text>
          <div>
            <div style={{ marginBottom: 4 }}>Include script code?</div>
            <Segmented
              value={includeScript}
              onChange={setIncludeScript}
              options={[
                { label: 'No', value: 'NO' },
                { label: 'Yes', value: 'YES' },
              ]}
            />
          </div>
          {includeScript === 'YES' && (
            <div>
              <div style={{ marginBottom: 4 }}>Exchange (its script code will be added)</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Select an exchange"
                loading={exportLoading}
                value={exportExchangeId}
                onChange={setExportExchangeId}
                options={exchanges.map((e) => ({
                  label: e.code ? `${e.name} (${e.code})` : e.name,
                  value: e.id,
                }))}
                notFoundContent={exportLoading ? 'Loading…' : 'No exchanges'}
              />
            </div>
          )}
        </Space>
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
