import { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/auth';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await registerUser(values.username, values.password);
      if (result.success) {
        message.success('สมัครสมาชิกสำเร็จ');
        navigate('/login');
      } else {
        message.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card title="สมัครสมาชิก" style={{ width: 350 }}>
        <Form name="register" onFinish={onFinish} layout="vertical">
          <Form.Item name="username" label="ชื่อผู้ใช้" rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}> 
            <Input />
          </Form.Item>
          <Form.Item name="password" label="รหัสผ่าน" rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}> 
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>สมัครสมาชิก</Button>
          </Form.Item>
          <Form.Item>
            <Button type="link" onClick={() => navigate('/login')} block>เข้าสู่ระบบ</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
