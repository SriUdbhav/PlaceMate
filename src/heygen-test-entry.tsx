import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeyGenIsolatedTest } from './components/test/HeyGenIsolatedTest';
import './index.css';

ReactDOM.createRoot(document.getElementById('test-root')!).render(
  <React.StrictMode>
    <div className="min-h-screen bg-slate-950 p-4">
      <HeyGenIsolatedTest />
    </div>
  </React.StrictMode>
);

