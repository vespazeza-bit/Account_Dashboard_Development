import { useState, useEffect } from 'react';
import { Menu, Avatar, Typography, Divider, Button, Tooltip } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ProfileOutlined,
  CalendarOutlined,
  LogoutOutlined,
  BarChartOutlined,
  UserOutlined,
  FundProjectionScreenOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { logoutUser, getCurrentUser } from '../utils/auth';

const { Text } = Typography;

const items = [
  { label: 'Dashboard',       key: '/dashboard',    icon: <DashboardOutlined /> },
  { label: 'คุณสมบัติโปรแกรม', key: '/features',   icon: <ProfileOutlined />  },
  { label: 'Test Case',       key: '/test-cases',   icon: <ExperimentOutlined /> },
  {
    label: 'แผนพัฒนาระบบ', key: 'schedule-group', icon: <CalendarOutlined />,
    children: [
      { label: 'แผนพัฒนาระบบ',     key: '/schedule',     icon: <CalendarOutlined /> },
      { label: 'สรุปแผนพัฒนาระบบ', key: '/plan-summary', icon: <FundProjectionScreenOutlined /> },
    ],
  },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState('');

  useEffect(() => {
    getCurrentUser().then(u => setUser(u || ''));
  }, []);

  const onClick = async (e) => {
    if (e.key === 'logout') {
      await logoutUser();
      navigate('/login');
    } else {
      navigate(e.key);
    }
  };

  return (
    <div style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>
          <BarChartOutlined style={{ fontSize: 22, color: '#fff' }} />
        </div>
        <div style={styles.brandText}>
          <Text strong style={{ color: '#fff', fontSize: 13, lineHeight: 1.3, display: 'block' }}>
            Accounting System
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
            Test Analytics
          </Text>
        </div>
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0 0 8px' }} />

      {/* Navigation */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={items}
        onClick={onClick}
        style={styles.menu}
        theme="dark"
      />

      {/* User + logout at bottom */}
      <div style={styles.footer}>
        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0 0 12px' }} />
        <div style={styles.userRow}>
          <Avatar icon={<UserOutlined />} size={32} style={{ background: '#4a5dc7', flexShrink: 0 }} />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user}
          </Text>
          <Tooltip title="ออกจากระบบ">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => onClick({ key: 'logout' })}
              style={{ color: 'rgba(255,255,255,0.55)', padding: '0 4px' }}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1a1f5e 0%, #2d3a9e 100%)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px 16px',
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  menu: {
    background: 'transparent',
    border: 'none',
    flex: 1,
    padding: '4px 8px',
  },
  footer: {
    padding: '0 12px 16px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};
