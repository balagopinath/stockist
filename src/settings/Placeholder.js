import { Typography, Card, Empty } from 'antd';

/**
 * Generic "coming soon" screen for master-data sections whose models
 * aren't built yet (Industries, Scripts, Exchanges).
 */
export default function Placeholder({ name }) {
  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {name}
      </Typography.Title>
      <Card>
        <Empty description={`${name} management coming soon.`} />
      </Card>
    </div>
  );
}
