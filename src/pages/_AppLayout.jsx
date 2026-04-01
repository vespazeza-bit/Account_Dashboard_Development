import React from 'react';
import MainMenu from '../components/MainMenu';

export default function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <MainMenu />
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
