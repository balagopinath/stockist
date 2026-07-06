import { Typography, Card, Empty } from 'antd';

export default function Trades() {
  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Trades
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Your buy and sell history. Coming in a later pass (TradeBook).
      </Typography.Paragraph>
      <Card>
        <Empty description="Trades coming soon." />
      </Card>
    </div>
  );
}
