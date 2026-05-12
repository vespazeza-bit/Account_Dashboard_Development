import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, message, Progress, Card, Spin, Popconfirm, Space } from 'antd';
import { DeleteOutlined, EditOutlined, FileExcelOutlined } from '@ant-design/icons';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getScheduleSummary } from '../utils/schedule';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

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

  const handleDelete = async (record) => {
    try {
      await deleteSchedule(record.key);
      setSchedules(prev => prev.filter(s => s.key !== record.key));
      message.success('ลบแผนงานสำเร็จ');
    } catch (err) {
      message.error('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  const handleExport = () => {
    if (!schedules.length) {
      message.warning('ยังไม่มีข้อมูลให้ส่งออก');
      return;
    }

    const rows = schedules.map((s, i) => ({
      'ลำดับ':         i + 1,
      'เฟส':           s.phase,
      'รายละเอียด':    s.detail,
      'วันที่เริ่ม':   dayjs(s.start).format('YYYY-MM-DD'),
      'วันที่สิ้นสุด': dayjs(s.end).format('YYYY-MM-DD'),
      'สถานะ':         STATUS.find(st => st.value === s.status)?.label || s.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 32 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
    ];

    const summaryRows = [
      { 'หัวข้อ': 'งานทั้งหมด',         'จำนวน': schedules.length },
      { 'หัวข้อ': 'เสร็จ',              'จำนวน': summary.done },
      { 'หัวข้อ': 'ระหว่างดำเนินการ',   'จำนวน': summary.inprogress },
      { 'หัวข้อ': 'ยังไม่เริ่ม',         'จำนวน': summary.notstarted },
      { 'หัวข้อ': 'ความก้าวหน้า (%)',   'จำนวน': summary.percentDone },
    ];
    const wsSum = XLSX.utils.json_to_sheet(summaryRows);
    wsSum['!cols'] = [{ wch: 24 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,    'แผนงาน');
    XLSX.utils.book_append_sheet(wb, wsSum, 'สรุป');

    const today = dayjs().format('DD-MM-YYYY');
    XLSX.writeFile(wb, `แผนการพัฒนาโปรแกรม_${today}.xlsx`);
    message.success('ส่งออก Excel สำเร็จ');
  };

  const columns = [
    { title: 'เฟส',          dataIndex: 'phase',  key: 'phase'  },
    { title: 'รายละเอียด',   dataIndex: 'detail', key: 'detail' },
    { title: 'วันที่เริ่ม',   dataIndex: 'start',  key: 'start',  render: v => dayjs(v).format('YYYY-MM-DD') },
    { title: 'วันที่สิ้นสุด', dataIndex: 'end',    key: 'end',    render: v => dayjs(v).format('YYYY-MM-DD') },
    { title: 'สถานะ',        dataIndex: 'status', key: 'status', render: v => STATUS.find(s => s.value === v)?.label },
    {
      title: '', key: 'action', width: 160,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>แก้ไข</Button>
          <Popconfirm
            title="ยืนยันการลบ"
            description={<span>ลบแผนงาน <strong>{r.phase}</strong>?<br/>{r.detail}</span>}
            okText="ลบ" cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>ลบ</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <h2>แผนการพัฒนาโปรแกรม</h2>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => openModal(null)}>เพิ่มแผนงาน</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ background: '#52c41a', color: '#fff', borderColor: '#52c41a' }}>
            ส่งออก Excel
          </Button>
        </Space>
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
