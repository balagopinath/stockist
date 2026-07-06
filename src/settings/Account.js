import { Typography, Card, Empty } from 'antd';

export default function Account() {
  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Account
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Your profile and sign-in details.
      </Typography.Paragraph>
      <Card>
        <Empty description="Account settings coming soon." />
      </Card>
    </div>
  );
}
