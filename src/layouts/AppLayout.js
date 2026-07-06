import { Layout, Button, Space, Avatar } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { initials } from '../utils';

const { Header, Content } = Layout;

/**
 * Main app shell: a single full-width Dashboard. The Settings button opens
 * the separate SettingsLayout (left-nav console).
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const { email, signOut } = useAuth();

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
        <div
          style={{
            fontWeight: 600,
            fontSize: 18,
            color: '#1677ff',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          Stockist
        </div>

        <Space size="middle">
          <Button type="text" onClick={() => navigate('/settings')}>
            Settings
          </Button>
          <Avatar style={{ background: '#e6f1fb', color: '#1677ff' }}>
            {initials(email)}
          </Avatar>
          <Button onClick={signOut}>Sign out</Button>
        </Space>
      </Header>

      <Content style={{ padding: 24, overflow: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
