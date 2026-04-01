import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, message, Progress, Card, Spin } from 'antd';
import { getSchedules, createSchedule, updateSchedule, getScheduleSummary } from '../utils/schedule';
import dayjs from 'dayjs';

const STATUS = [
  { label: 'เสร็จ',               value: 'done'       },
  { label: 'ระหว่างดำเนินการ',   value: 'inprogress'  },
  { label: 'ยังไม่เริ่ม',          value: 'notstarted' },
];

export default function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [form]                    = Form.useForm();

  useEffect(() => {
    getSchedules()
      .then(setSchedules)
      .catch(err => message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const summary = getScheduleSummary(schedules);

  const openModal = (record) => {
    setEditing(record || null);
    setModalOpen(true);
    if (record) form.setFieldsValue({ ...record, range: [dayjs(record.start), dayjs(record.end)] });
    else form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const { range, ...rest } = values;
      const data = { ...rest, start: range[0].toISOString(), end: range[1].toISOString() };
      setSaving(true);
      if (editing) {
        await updateSchedule(editing.key, data);
        setSchedules(prev => prev.map(s => s.key === editing.key ? { ...editing, ...data } : s));
      } else {
        await createSchedule(data);
        const fresh = await getSchedules();
        setSchedules(fresh);
      }
      setModalOpen(false);
      setEditing(null);
      message.success('บันทึกแผนงานสำเร็จ');
    } catch (err) {
      if (err?.errorFields) return;
      message.error('บันทึกไม่สำเร็จ: ' + err.message);
    } finally { setSaving(false); }
  };

  const columns = [
    { title: 'เฟส',          dataIndex: 'phase',  key: 'phase'  },
    { title: 'รายละเอียด',   dataIndex: 'detail', key: 'detail' },
    { title: 'วันที่เริ่ม',   dataIndex: 'start',  key: 'start',  render: v => dayjs(v).format('YYYY-MM-DD') },
    { title: 'วันที่สิ้นสุด', dataIndex: 'end',    key: 'end',    render: v => dayjs(v).format('YYYY-MM-DD') },
    { title: 'สถานะ',        dataIndex: 'status', key: 'status', render: v => STATUS.find(s => s.value === v)?.label },
    { title: '', key: 'action', render: (_, r) => <Button size="small" onClick={() => openModal(r)}>แก้ไข</Button> },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <h2>แผนการพัฒนาโปรแกรม</h2>
        <Button type="primary" onClick={() => openModal(null)} style={{ marginBottom: 16 }}>เพิ่มแผนงาน</Button>
        <Table dataSource={schedules} columns={columns} rowKey="key" />
        <Card title="สรุปแผนงาน" style={{ marginTop: 24 }}>
          <Progress percent={summary.percentDone} status="active" />
          <div>เสร็จ: {summary.done} | ระหว่างดำเนินการ: {summary.inprogress} | ยังไม่เริ่ม: {summary.notstarted}</div>
        </Card>
        <Modal open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleOk}
          confirmLoading={saving} title={editing ? 'แก้ไขแผนงาน' : 'เพิ่มแผนงาน'}
          okText="บันทึก" cancelText="ยกเลิก">
          <Form form={form} layout="vertical">
            <Form.Item name="phase"  label="เฟส"         rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="detail" label="รายละเอียด"  rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="range"  label="ช่วงเวลา"    rules={[{ required: true }]}><DatePicker.RangePicker /></Form.Item>
            <Form.Item name="status" label="สถานะ"       rules={[{ required: true }]}><Select options={STATUS} /></Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
}
