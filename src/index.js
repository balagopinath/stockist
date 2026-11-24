// Must be first: configures Amplify before any module's top-level
// generateClient() runs (see amplifyConfig.js for why).
import './amplifyConfig';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// Stockist is served under www.gopsweb.com/stockist. The path comes from
// "homepage" in package.json (CRA exposes it as PUBLIC_URL), so asset URLs
// and routes always agree.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter basename={process.env.PUBLIC_URL}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </BrowserRouter>
);
