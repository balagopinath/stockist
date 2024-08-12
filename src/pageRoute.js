import React, {forwardRef } from 'react';
import { Routes, Route } from "react-router-dom";
import Dashboard from './pages/dashboard';
import StockPortfolio from './pages/stockPortfolio';
import './pageRoute.css';
import Settings from './pages/settings';

const PageRoute = forwardRef((props, refer) => {
    // You can use the ref here if needed
    return (<div className='pageRouteContainer'>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stock" element={<StockPortfolio />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
      </div>);
});

export default PageRoute;


