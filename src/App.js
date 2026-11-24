import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';
import { ConfigProvider } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AppLayout from './layouts/AppLayout';
import SettingsLayout from './layouts/SettingsLayout';
import RequireAdmin from './components/RequireAdmin';
import Dashboard from './pages/Dashboard';
import Portfolio from './settings/Portfolio';
import DailyTrades from './settings/DailyTrades';
import Funds from './settings/Funds';
import CapitalTracker from './settings/CapitalTracker';
import Recovery from './settings/Recovery';
import Account from './settings/Account';
import Companies from './settings/Companies';
import Industries from './settings/Industries';
import Exchanges from './settings/Exchanges';
import Scripts from './settings/Scripts';
import Brokers from './settings/Brokers';
import DailyPrices from './settings/DailyPrices';
import DataBrowser from './settings/DataBrowser';

function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Authenticator>
        {({ signOut, user }) => (
          <AuthProvider user={user} signOut={signOut}>
            <Routes>
              {/* Main app — single full-width dashboard */}
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
              </Route>

              {/* Settings console — left nav */}
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="portfolio" replace />} />
                {/* Preferences — every signed-in user */}
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="daily-trades" element={<DailyTrades />} />
                <Route path="funds" element={<Funds />} />
                <Route path="capital" element={<CapitalTracker />} />
                <Route path="recovery" element={<Recovery />} />
                <Route path="account" element={<Account />} />
                {/* Master data — admins only */}
                <Route
                  path="companies"
                  element={
                    <RequireAdmin>
                      <Companies />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="industries"
                  element={
                    <RequireAdmin>
                      <Industries />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="scripts"
                  element={
                    <RequireAdmin>
                      <Scripts />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="exchanges"
                  element={
                    <RequireAdmin>
                      <Exchanges />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="brokers"
                  element={
                    <RequireAdmin>
                      <Brokers />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="daily-prices"
                  element={
                    <RequireAdmin>
                      <DailyPrices />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="data-browser"
                  element={
                    <RequireAdmin>
                      <DataBrowser />
                    </RequireAdmin>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        )}
      </Authenticator>
    </ConfigProvider>
  );
}

export default App;
