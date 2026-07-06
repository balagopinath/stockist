import { Spin, Result } from 'antd';
import { useAuth } from '../auth/AuthContext';

/**
 * Gates admin-only screens. While group membership is loading we show a
 * spinner; non-admins get a 403. This is UX only — the real enforcement
 * is the `allow.group('admin')` rule on the data model itself.
 */
export default function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();

  if (isAdmin === null) {
    return <Spin style={{ display: 'block', marginTop: 48 }} />;
  }
  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="No access"
        subTitle="This section is for admins only."
      />
    );
  }
  return children;
}
