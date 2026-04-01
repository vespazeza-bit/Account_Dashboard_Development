import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Features from './pages/Features';
import MainTopics from './pages/MainTopics';
import Schedule from './pages/Schedule';
import PlanSummary from './pages/PlanSummary';
import TestCase from './pages/TestCase';
import AppLayout from './pages/_AppLayout';
import { getCurrentUser } from './utils/auth';

function PrivateRoute({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'auth' | 'unauth'

  useEffect(() => {
    getCurrentUser()
      .then(user => setStatus(user ? 'auth' : 'unauth'))
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }
  return status === 'auth' ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/features"    element={<PrivateRoute><Features /></PrivateRoute>} />
        <Route path="/main-topics" element={<PrivateRoute><MainTopics /></PrivateRoute>} />
        <Route path="/schedule"    element={<PrivateRoute><Schedule /></PrivateRoute>} />
        <Route path="/plan-summary" element={<PrivateRoute><PlanSummary /></PrivateRoute>} />
        <Route path="/test-cases"  element={<PrivateRoute><TestCase /></PrivateRoute>} />
        <Route path="*"            element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}
