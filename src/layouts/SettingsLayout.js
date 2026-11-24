import { Layout, Menu, Button, Space, Avatar, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { initials } from '../utils';

const { Header, Sider, Content } = Layout;

/**
 * Settings console: a focused mode with its own left-nav. The main app's
 * top menus are gone — only "Back to app" returns the user.
 *
 * Menu groups adapt to role:
 *   Preferences (everyone) — Portfolio, Account
 *   Master data (admins)   — Companies, Industries, Scripts, Exchanges
 */
export default function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, signOut, isAdmin } = useAuth();

  const active = location.pathname.split('/')[2] || 'portfolio';

  const items = [
    {
      type: 'group',
      label: 'Preferences',
      children: [
        { key: 'portfolio', label: 'Portfolio' },
        { key: 'daily-trades', label: 'Daily Trades' },
        { key: 'funds', label: 'Funds' },
        { key: 'capital', label: 'Capital Tracker' },
        { key: 'recovery', label: 'Loss Recovery' },
        { key: 'account', label: 'Account' },
      ],
    },
  ];

  if (isAdmin) {
    items.push({
      type: 'group',
      label: 'Master data',
      children: [
        { key: 'companies', label: 'Companies' },
        { key: 'industries', label: 'Industries' },
        { key: 'scripts', label: 'Scripts' },
        { key: 'exchanges', label: 'Exchanges' },
        { key: 'brokers', label: 'Brokers' },
        { key: 'daily-prices', label: 'Daily Prices' },
        { key: 'data-browser', label: 'Data Browser' },
      ],
    });
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          paddingInline: 24,
        }}
      >
        <Space size="middle">
          <Button type="text" onClick={() => navigate('/')}>
            ← Back to app
          </Button>
          <Typography.Text strong style={{ fontSize: 16 }}>
            Settings
          </Typography.Text>
        </Space>
        <Space size="middle">
          <span style={{ color: '#888' }}>{email}</span>
          <Avatar style={{ background: '#e6f1fb', color: '#1677ff' }}>
            {initials(email)}
          </Avatar>
          <Button onClick={signOut}>Sign out</Button>
        </Space>
      </Header>

      <Layout style={{ overflow: 'hidden' }}>
        <Sider
          width={210}
          theme="light"
          style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
        >
          <Menu
            mode="inline"
            selectedKeys={[active]}
            items={items}
            onClick={({ key }) => navigate(`/settings/${key}`)}
            style={{ height: '100%', borderRight: 'none', paddingTop: 8 }}
          />
        </Sider>

        <Content style={{ padding: 24, minWidth: 0, overflow: 'auto' }}>
          <div style={{ maxWidth: 1600, width: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
