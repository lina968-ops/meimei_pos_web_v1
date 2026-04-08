import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Checkout from './pages/Checkout';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';

function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Checkout />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  );
}

export default App;
