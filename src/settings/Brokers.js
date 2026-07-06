import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import {
  Typography,
  Space,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  message,
} from 'antd';
import { ZERODHA_DEFAULTS } from '../charges';

const client = generateClient();

async function listAll(model) {
  let all = [];
  let nextToken = null;
  do {
    const { data, nextToken: nt, errors } = await model.list({ limit: 1000, nextToken });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    all = all.concat(data);
    nextToken = nt;
  } while (nextToken);
  return all;
}

// [field, label] pairs for the rate inputs
const RATE_FIELDS = [
  ['brokerageDeliveryPct', 'Brokerage delivery %'],
  ['brokerageIntradayPct', 'Brokerage intraday %'],
  ['brokerageIntradayMax', 'Brokerage intraday cap ₹'],
  ['sttDeliveryPct', 'STT delivery % (each side)'],
  ['sttIntradayPct', 'STT intraday % (sell)'],
  ['exchTxnNsePct', 'Exch txn NSE %'],
  ['exchTxnBsePct', 'Exch txn BSE %'],
  ['sebiPct', 'SEBI %'],
  ['stampDeliveryPct', 'Stamp delivery % (buy)'],
  ['stampIntradayPct', 'Stamp intraday % (buy)'],
  ['gstPct', 'GST %'],
  ['dpFlat', 'DP charge ₹ (delivery sell)'],
];

export default function Brokers() {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      if (!client.models.Broker) {
        message.error('Broker model not deployed yet. Run "npm run sandbox:once".');
        return;
      }
      setBrokers(await listAll(client.models.Broker));
    } catch (e) {
      message.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd(preset) {
    setEditing(null);
    form.resetFields();
    if (preset) form.setFieldsValue(preset);
    setFormOpen(true);
  }
  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue(record);
    setFormOpen(true);
  }

  async function submit(values) {
    setSaving(true);
    const { errors } = editing
      ? await client.models.Broker.update({ id: editing.id, ...values })
      : await client.models.Broker.create(values);
    setSaving(false);
    if (errors) return message.error(errors.map((e) => e.message).join(', '));
    message.success(editing ? 'Broker updated' : 'Broker added');
    setFormOpen(false);
    load();
  }

  async function remove(id) {
    const { errors } = await client.models.Broker.delete({ id });
    if (errors) message.error(errors.map((e) => e.message).join(', '));
    else {
      message.success('Deleted');
      load();
    }
  }

  const columns = [
    { title: 'Broker', dataIndex: 'name' },
    {
      title: 'Delivery brk %',
      dataIndex: 'brokerageDeliveryPct',
      align: 'right',
    },
    {
      title: 'Intraday brk %',
      dataIndex: 'brokerageIntradayPct',
      align: 'right',
    },
    { title: 'STT del %', dataIndex: 'sttDeliveryPct', align: 'right' },
    { title: 'GST %', dataIndex: 'gstPct', align: 'right' },
    {
      title: '',
      key: 'actions',
      width: 130,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Popconfirm title="Delete this broker?" onConfirm={() => remove(r.id)} okText="Delete">
            <Button size="small" danger type="text">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const hasZerodha = brokers.some((b) => (b.name || '').toLowerCase() === 'zerodha');

  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Brokers
        </Typography.Title>
        <Typography.Text type="secondary">
          Brokers and their charge rates. Selected when uploading a tradebook to
          compute taxes &amp; charges.
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!hasZerodha && (
          <Button onClick={() => openAdd(ZERODHA_DEFAULTS)}>Seed Zerodha</Button>
        )}
        <Button type="primary" onClick={() => openAdd(null)}>
          Add broker
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={brokers}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'No brokers yet — click Seed Zerodha or Add broker.' }}
      />

      <Modal
        title={editing ? 'Edit broker' : 'Add broker'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? 'Save' : 'Add'}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="name"
            label="Broker name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Zerodha" />
          </Form.Item>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 16px',
            }}
          >
            {RATE_FIELDS.map(([name, label]) => (
              <Form.Item key={name} name={name} label={label} style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} step={0.001} />
              </Form.Item>
            ))}
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
