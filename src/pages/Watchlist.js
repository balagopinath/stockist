import { Typography, Card, Empty } from 'antd';

export default function Watchlist() {
  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Watchlist
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Stocks you’re monitoring but don’t necessarily hold.
      </Typography.Paragraph>
      <Card>
        <Empty description="Watchlist coming soon." />
      </Card>
    </div>
  );
}
