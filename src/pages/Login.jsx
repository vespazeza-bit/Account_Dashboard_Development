import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import {
  UserOutlined, LockOutlined, BarChartOutlined,
  CheckCircleFilled, SafetyCertificateFilled, ThunderboltFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/auth';

const FEATURES = [
  { icon: <BarChartOutlined />,         text: 'วิเคราะห์ข้อมูลแบบ Real-time' },
  { icon: <CheckCircleFilled />,        text: 'ติดตามสถานะ Test Case ได้ทุกขั้นตอน' },
  { icon: <SafetyCertificateFilled />,  text: 'ระบบแผนงานและสรุปความก้าวหน้า' },
  { icon: <ThunderboltFilled />,        text: 'รองรับหลายผู้ใช้งานพร้อมกัน' },
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await loginUser(values.username, values.password);
      if (result.success) {
        message.success('เข้าสู่ระบบสำเร็จ');
        navigate('/dashboard');
      } else {
        message.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ── decorative blobs ── */}
      <div style={{ ...s.blob, top: -120, left: -120, width: 400, height: 400, opacity: 0.18 }} />
      <div style={{ ...s.blob, bottom: -80, right: -80, width: 320, height: 320, opacity: 0.12 }} />
      <div style={{ ...s.blob, top: '40%', left: '35%', width: 200, height: 200, opacity: 0.08 }} />

      <div style={s.layout}>
        {/* ── LEFT: brand panel ── */}
        <div style={s.left}>
          <div style={s.leftInner}>
            {/* Logo */}
            <div style={s.logoWrap}>
              <div style={s.logoBox}>
                <BarChartOutlined style={{ fontSize: 36, color: '#fff' }} />
              </div>
              <div>
                <div style={s.logoTitle}>Accounting System</div>
                <div style={s.logoSub}>Test Analytics Platform</div>
              </div>
            </div>

            {/* Headline */}
            <h1 style={s.headline}>
              บริหารจัดการ<br />
              <span style={s.headlineAccent}>คุณสมบัติและแผนงาน</span><br />
              ได้ในที่เดียว
            </h1>
            <p style={s.tagline}>
              ระบบจัดการ Test Analytics สำหรับทีมพัฒนา<br />
              ครบครันในทุกกระบวนการทดสอบ
            </p>

            {/* Feature list */}
            <div style={s.featureList}>
              {FEATURES.map((f, i) => (
                <div key={i} style={s.featureItem}>
                  <div style={s.featureIcon}>{f.icon}</div>
                  <span style={s.featureText}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* bottom badge */}
          <div style={s.badge}>
            <div style={s.badgeDot} />
            ระบบพร้อมใช้งาน
          </div>
        </div>

        {/* ── RIGHT: form panel ── */}
        <div style={s.right}>
          <div style={s.card}>
            {/* Card header */}
            <div style={s.cardHeader}>
              <div style={s.cardIconWrap}>
                <UserOutlined style={{ fontSize: 22, color: '#4a5dc7' }} />
              </div>
              <h2 style={s.cardTitle}>เข้าสู่ระบบ</h2>
              <p style={s.cardSub}>กรุณากรอกข้อมูลเพื่อเข้าใช้งาน</p>
            </div>

            {/* Form */}
            <Form name="login" onFinish={onFinish} layout="vertical" style={{ marginTop: 8 }}>
              <Form.Item
                name="username"
                label={<span style={s.label}>ชื่อผู้ใช้</span>}
                rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#a0aec0' }} />}
                  placeholder="กรอกชื่อผู้ใช้"
                  size="large"
                  style={s.input}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={s.label}>รหัสผ่าน</span>}
                rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
                style={{ marginBottom: 24 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                  placeholder="กรอกรหัสผ่าน"
                  size="large"
                  style={s.input}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  style={s.loginBtn}
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </Button>
              </Form.Item>
            </Form>

            {/* Divider */}
            <div style={s.dividerRow}>
              <span style={s.dividerLine} />
              <span style={s.dividerText}>ยังไม่มีบัญชี?</span>
              <span style={s.dividerLine} />
            </div>

            <Button
              block
              size="large"
              onClick={() => navigate('/register')}
              style={s.registerBtn}
            >
              สมัครสมาชิกใหม่
            </Button>

            <p style={s.hint}>
              ระบบนี้สำหรับทีมพัฒนาและทีมทดสอบเท่านั้น
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f1340 0%, #1a1f5e 40%, #2d3a9e 75%, #3d52c4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Sarabun', 'Segoe UI', sans-serif",
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #7dd3fc, #4a5dc7)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  layout: {
    display: 'flex',
    width: '100%',
    maxWidth: 1000,
    minHeight: 600,
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
    position: 'relative',
    zIndex: 1,
  },

  /* ── Left ── */
  left: {
    flex: 1,
    background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
    backdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    padding: '48px 44px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#fff',
  },
  leftInner: { flex: 1 },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 44,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  headline: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 16px',
    lineHeight: 1.35,
  },
  headlineAccent: {
    background: 'linear-gradient(90deg, #7dd3fc, #a5b4fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 36px',
    lineHeight: 1.7,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#7dd3fc',
    fontSize: 14,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(82,196,26,0.15)',
    border: '1px solid rgba(82,196,26,0.35)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    color: '#95f06c',
    marginTop: 36,
    width: 'fit-content',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#52c41a',
    boxShadow: '0 0 6px #52c41a',
  },

  /* ── Right ── */
  right: {
    width: 420,
    background: '#f7f8fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    boxShadow: '0 8px 40px rgba(26,31,94,0.1)',
    border: '1px solid #eef0f8',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: 28,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #eef1fb, #dce3f8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '1px solid #d4dcf5',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1f5e',
    margin: '0 0 6px',
  },
  cardSub: {
    fontSize: 14,
    color: '#8896b3',
    margin: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    background: '#f9fafb',
    fontSize: 14,
  },
  loginBtn: {
    background: 'linear-gradient(135deg, #2d3a9e, #4a5dc7)',
    border: 'none',
    borderRadius: 10,
    height: 48,
    fontSize: 15,
    fontWeight: 600,
    boxShadow: '0 6px 20px rgba(45,58,158,0.4)',
    letterSpacing: 0.3,
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '4px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e8ecf4',
    display: 'block',
  },
  dividerText: {
    fontSize: 13,
    color: '#a0aec0',
    whiteSpace: 'nowrap',
  },
  registerBtn: {
    borderRadius: 10,
    height: 46,
    fontSize: 14,
    border: '1.5px solid #d4dcf5',
    color: '#4a5dc7',
    fontWeight: 600,
    background: '#fff',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#c0c9e0',
    margin: '16px 0 0',
  },
};
