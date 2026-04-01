import { useState, useMemo, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  message, Space, Tooltip, Tag, Card, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined,
} from '@ant-design/icons';
import { getMainTopics, createMainTopic, updateMainTopic, deleteMainTopic } from '../utils/maintopic';
import { getModules } from '../utils/module';

export default function MainTopics() {
  const [topics,    setTopics]   = useState([]);
  const [modules,   setModules]  = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [filterMod, setFilterMod] = useState(null);
  const [form]                    = Form.useForm();

  useEffect(() => {
    Promise.all([getMainTopics(), getModules()])
      .then(([t, m]) => { setTopics(t); setModules(m); })
      .catch(err => message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const openModal = (record) => {
    setEditing(record || null);
    setModalOpen(true);
    if (record) form.setFieldsValue({ module: record.module, label: record.label });
    else form.resetFields();
  };

  const handleOk = async () => {
    try {
      const { module, label } = await form.validateFields();
      const trimLabel = label.trim();
      const isDup = topics.some(t => t.module === module && t.label === trimLabel && t.key !== editing?.key);
      if (isDup) { message.error('หัวข้อหลักนี้มีอยู่ในระบบงานนี้แล้ว'); return; }

      if (editing) {
        await updateMainTopic(editing.key, module, trimLabel);
        setTopics(prev => prev.map(t => t.key === editing.key ? { ...t, module, label: trimLabel } : t));
      } else {
        const key = `mt_${Date.now()}`;
        await createMainTopic(key, module, trimLabel);
        setTopics(prev => [...prev, { key, module, label: trimLabel }]);
      }
      setModalOpen(false);
      setEditing(null);
      message.success('บันทึกข้อมูลสำเร็จ');
    } catch (err) {
      if (err?.errorFields) return;
      message.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'ยืนยันการลบ',
      content: `ต้องการลบ "${record.label}" ใช่หรือไม่?`,
      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteMainTopic(record.key);
          setTopics(prev => prev.filter(t => t.key !== record.key));
          message.success('ลบข้อมูลสำเร็จ');
        } catch (err) { message.error('ลบไม่สำเร็จ: ' + err.message); }
      },
    });
  };

  const displayed = useMemo(
    () => filterMod ? topics.filter(t => t.module === filterMod) : topics,
    [topics, filterMod]
  );

  const moduleLabel = (val) => modules.find(m => m.value === val)?.label ?? val;

  const columns = [
    { title: 'ลำดับ', key: 'no', width: 64, align: 'center', render: (_, __, i) => i + 1 },
    {
      title: 'ระบบงาน', dataIndex: 'module', width: 220,
      render: v => <Tag color="blue" style={{ fontSize: 13 }}>{moduleLabel(v)}</Tag>,
    },
    {
      title: 'หัวข้อหลักคุณสมบัติ', dataIndex: 'label',
      render: v => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'การดำเนินการ', key: 'action', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Tooltip title="แก้ไข"><Button icon={<EditOutlined />} size="small" onClick={() => openModal(r)} /></Tooltip>
          <Tooltip title="ลบ"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOutlined style={{ fontSize: 22, color: '#1a1f5e' }} />
            <h2 style={{ margin: 0 }}>กำหนดหัวข้อหลักคุณสมบัติ</h2>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
            เพิ่มหัวข้อหลัก
          </Button>
        </div>

        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Space>
            <span style={{ fontWeight: 500 }}>กรองตามระบบงาน:</span>
            <Select allowClear placeholder="ทุกระบบงาน" style={{ width: 240 }}
              options={modules} value={filterMod} onChange={setFilterMod} />
            <span style={{ color: '#888' }}>แสดง {displayed.length} จาก {topics.length} รายการ</span>
          </Space>
        </Card>

        <Table
          dataSource={displayed} columns={columns} rowKey="key" bordered size="middle"
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
          locale={{ emptyText: 'ยังไม่มีหัวข้อหลัก กรุณากด "เพิ่มหัวข้อหลัก"' }}
        />

        <Modal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }}
          onOk={handleOk} title={editing ? 'แก้ไขหัวข้อหลักคุณสมบัติ' : 'เพิ่มหัวข้อหลักคุณสมบัติ'}
          okText="บันทึก" cancelText="ยกเลิก" width={480}>
          <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
            <Form.Item name="module" label="ระบบงาน" rules={[{ required: true, message: 'กรุณาเลือกระบบงาน' }]}>
              <Select options={modules} placeholder="เลือกระบบงาน" showSearch />
            </Form.Item>
            <Form.Item name="label" label="หัวข้อหลักคุณสมบัติ" rules={[{ required: true, message: 'กรุณากรอกหัวข้อหลัก' }]}>
              <Input placeholder="เช่น การบันทึกใบสำคัญจ่าย" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
}
