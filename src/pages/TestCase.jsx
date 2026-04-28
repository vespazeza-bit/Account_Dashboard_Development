import { useState, useMemo, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, DatePicker,
  message, Space, Tooltip, Divider, Typography, Card, Row, Col, Statistic, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FilterOutlined, MinusCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTestCases, createTestCase, updateTestCase, deleteTestCase, nextTcNo } from '../utils/testcase';
import { getFeatures } from '../utils/feature';
import { getModules } from '../utils/module';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const TC_STATUS = [
  { label: 'รอทดสอบ', value: 'pending' },
  { label: 'ผ่าน',    value: 'pass'    },
  { label: 'ไม่ผ่าน', value: 'fail'    },
];

const TC_STATUS_COLOR = { pass: 'success', fail: 'error', pending: 'warning' };
const TC_STATUS_LABEL = { pass: 'ผ่าน', fail: 'ไม่ผ่าน', pending: 'รอทดสอบ' };
const TC_STATUS_ICON  = {
  pass:    <CheckCircleOutlined />,
  fail:    <CloseCircleOutlined />,
  pending: <ClockCircleOutlined />,
};

// Normalize feature to always have details array
function normalizeFeature(f) {
  if (f.details) return f;
  return { ...f, details: [{ detail: f.detail ?? '', status: f.status ?? 'pending', reason: f.reason ?? '' }] };
}

export default function TestCase() {
  const [testCases, setTestCases] = useState([]);
  const [features,  setFeatures]  = useState([]);
  const [modules,   setModules]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Filters
  const [filterModule, setFilterModule] = useState(null);
  const [filterMain,   setFilterMain]   = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [searchText,   setSearchText]   = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const PAGE_SIZE = 20;

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [form]                    = Form.useForm();

  // โหลดข้อมูลครั้งแรก
  useEffect(() => {
    Promise.all([getTestCases(), getFeatures(), getModules()])
      .then(([tc, f, m]) => {
        setTestCases(tc);
        setFeatures(f.map(normalizeFeature));
        setModules(m);
      })
      .catch(err => message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Options: module dropdown (สำหรับ form) ──
  const moduleOptions = useMemo(
    () => modules.map(m => ({ label: m.label, value: m.value })),
    [modules]
  );

  // ── Options: ระบบงาน (จาก systemName) ──
  const systemOptions = useMemo(() => {
    const set = new Set(testCases.map(tc => tc.systemName).filter(Boolean));
    return [...set].sort((a, b) => {
      const na = parseInt(a) || 0; const nb = parseInt(b) || 0;
      return na - nb || a.localeCompare(b);
    }).map(v => ({ label: v, value: v }));
  }, [testCases]);

  // ── Filtered test cases ──────────────────────────────────────────
  const filteredTC = useMemo(() => {
    let list = testCases;
    if (filterModule) {
      // filterModule ตอนนี้ใช้กับ systemName (เปลี่ยนความหมายเดิม)
      list = list.filter(tc => tc.systemName === filterModule);
    }
    if (filterMain) {
      const featureKeysInMain = features.filter(f => f.main === filterMain).map(f => f.key);
      list = list.filter(tc => featureKeysInMain.includes(tc.featureKey));
    }
    if (filterStatus) list = list.filter(tc => tc.status === filterStatus);
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(tc =>
        tc.tcNo?.toLowerCase().includes(q) ||
        tc.title?.toLowerCase().includes(q) ||
        tc.systemName?.toLowerCase().includes(q) ||
        tc.tester?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [testCases, features, filterModule, filterMain, filterStatus, searchText]);

  // ── สรุปผลแยกตาม ระบบงาน ──
  const systemSummary = useMemo(() => {
    const map = {};
    testCases.forEach(tc => {
      const sys = tc.systemName || 'ไม่ระบุระบบ';
      if (!map[sys]) map[sys] = { system: sys, total: 0, pass: 0, fail: 0, pending: 0 };
      map[sys].total++;
      if (tc.status === 'pass')    map[sys].pass++;
      else if (tc.status === 'fail') map[sys].fail++;
      else                           map[sys].pending++;
    });
    const list = Object.values(map).map(s => ({
      ...s,
      passRate: s.total ? Math.round((s.pass / s.total) * 100) : 0,
    }));
    return list.sort((a, b) => {
      const na = parseInt(a.system) || 0;
      const nb = parseInt(b.system) || 0;
      return na - nb || a.system.localeCompare(b.system);
    });
  }, [testCases]);

  useEffect(() => { setCurrentPage(1); }, [filterModule, filterMain, filterStatus, searchText]);

  // ── Summary stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = filteredTC.length;
    const pass    = filteredTC.filter(t => t.status === 'pass').length;
    const fail    = filteredTC.filter(t => t.status === 'fail').length;
    const pending = filteredTC.filter(t => t.status === 'pending').length;
    return { total, pass, fail, pending };
  }, [filteredTC]);

  // ── Helper: map systemName (เช่น "6.ระบบเจ้าหนี้") → module value ──
  const matchModuleBySystemName = (systemName) => {
    if (!systemName) return null;
    const s = systemName.toLowerCase();
    // หา module ที่ label มี keyword ตรงกับ systemName
    const found = modules.find(m => {
      const lbl = (m.label || '').toLowerCase();
      // ตรวจ keyword หลัก: เจ้าหนี้, ลูกหนี้, ผู้ดูแลระบบ, สินทรัพย์, รายได้, ระบบบัญชี
      const keywords = ['เจ้าหนี้', 'ลูกหนี้', 'ผู้ดูแลระบบ', 'สินทรัพย์', 'รายได้', 'ระบบบัญชี'];
      return keywords.some(k => s.includes(k) && lbl.includes(k));
    });
    return found?.value || null;
  };

  // ── Helper: get feature + detail label ─────────────────────────
  const getFeatureLabel = (featureKey) => {
    const f = features.find(f => f.key === featureKey);
    if (!f) return { module: '-', main: '-', sub: '-' };
    const mod = modules.find(m => m.value === f.module);
    return { module: mod?.label ?? f.module, main: f.main, sub: f.sub };
  };

  const getDetailLabel = (featureKey, detailIndex) => {
    const f = features.find(f => f.key === featureKey);
    if (!f) return '-';
    return f.details?.[detailIndex]?.detail ?? '-';
  };

  // ── CRUD ─────────────────────────────────────────────────────────
  const openAdd = async () => {
    setEditing(null);
    setModalOpen(true);
    form.resetFields();
    const tcNo = await nextTcNo().catch(() => 'TC-001');
    form.setFieldsValue({ tcNo, status: 'pending', steps: [{ action: '' }] });
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
    // หา module value จาก systemName ถ้า record ไม่มี module เดิม
    let moduleValue = null;
    if (record.featureKey) {
      const f = features.find(f => f.key === record.featureKey);
      moduleValue = f?.module || null;
    }
    if (!moduleValue && record.systemName) {
      moduleValue = matchModuleBySystemName(record.systemName);
    }
    form.setFieldsValue({
      ...record,
      module: moduleValue,
      testDate: record.testDate ? dayjs(record.testDate) : null,
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, testDate: values.testDate ? values.testDate.format('YYYY-MM-DD') : null };
      setSaving(true);
      if (editing) {
        await updateTestCase(editing.key, payload);
        setTestCases(prev => prev.map(t => t.key === editing.key ? { ...editing, ...payload } : t));
      } else {
        await createTestCase(payload);
        const fresh = await getTestCases();
        setTestCases(fresh);
      }
      setModalOpen(false);
      setEditing(null);
      message.success('บันทึก Test Case สำเร็จ');
    } catch (err) {
      if (err?.errorFields) return;
      message.error('บันทึกไม่สำเร็จ: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'ยืนยันการลบ',
      content: `ต้องการลบ "${record.tcNo} – ${record.title}" ใช่หรือไม่?`,
      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteTestCase(record.key);
          setTestCases(prev => prev.filter(t => t.key !== record.key));
          message.success('ลบ Test Case สำเร็จ');
        } catch (err) { message.error('ลบไม่สำเร็จ: ' + err.message); }
      },
    });
  };

  // ── Table columns ─────────────────────────────────────────────────
  const columns = [
    {
      title: 'TC No.', dataIndex: 'tcNo', width: 110, fixed: 'left',
      render: v => <Text strong style={{ color: '#1a1f5e' }}>{v}</Text>,
    },
    {
      title: 'ระบบงาน', dataIndex: 'systemName', width: 220,
      render: (v, r) => v || getFeatureLabel(r.featureKey).module || '-',
    },
    {
      title: 'หัวข้อทดสอบ', dataIndex: 'title', width: 360,
      render: v => <Text ellipsis={{ tooltip: v }}>{v}</Text>,
    },
    {
      title: 'ขั้นตอน', key: 'steps', width: 90, align: 'center',
      render: (_, r) => <Tag>{r.steps?.length ?? 0} ขั้นตอน</Tag>,
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 110,
      render: v => (
        <Tag color={TC_STATUS_COLOR[v]} icon={TC_STATUS_ICON[v]}>
          {TC_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    { title: 'ผู้ทดสอบ',    dataIndex: 'tester',   width: 100 },
    { title: 'วันที่ทดสอบ', dataIndex: 'testDate', width: 110 },
    {
      title: '', key: 'action', width: 80, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="แก้ไข"><Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /></Tooltip>
          <Tooltip title="ลบ"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  // ── Expanded row: show steps + actual result ───────────────────
  const expandedRowRender = (record) => {
    const stepCols = [
      { title: 'ขั้นตอนที่', key: 'no', width: 80, align: 'center', render: (_, __, i) => i + 1 },
      {
        title: 'ขั้นตอนการทดสอบ',
        dataIndex: 'action',
        render: (_, r) => typeof r === 'string' ? r : (r.action || r.detail || ''),
      },
    ];
    return (
      <div style={{ padding: '8px 16px 16px' }}>
        {record.testUrl && (
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ color: '#555', fontSize: 12 }}>URL ที่ทดสอบ: </Text>
            <Text code style={{ fontSize: 13 }}>{record.testUrl}</Text>
          </div>
        )}
        {record.precondition && (
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ color: '#555', fontSize: 12, display: 'block', marginBottom: 2 }}>เงื่อนไขเบื้องต้น:</Text>
            <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{record.precondition}</Text>
          </div>
        )}
        <Table
          columns={stepCols}
          dataSource={(record.steps || []).map((s, i) => ({ ...s, key: i }))}
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 12 }}
        />
        {record.actualResult && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '8px 12px' }}>
            <Text strong style={{ color: '#389e0d', fontSize: 12, display: 'block', marginBottom: 4 }}>ผลที่คาดหวัง:</Text>
            <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>{record.actualResult}</Paragraph>
          </div>
        )}
        {record.remark && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>หมายเหตุ: {record.remark}</Text>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
  <Spin spinning={loading}>
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: 10, color: '#1a1f5e' }} />
          Test Case
        </h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>เพิ่ม Test Case</Button>
      </div>

      {/* Summary stat cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { label: 'ทั้งหมด',  value: stats.total,   color: '#1a1f5e', bg: '#f0f5ff' },
          { label: 'ผ่าน',     value: stats.pass,    color: '#389e0d', bg: '#f6ffed' },
          { label: 'ไม่ผ่าน', value: stats.fail,    color: '#cf1322', bg: '#fff1f0' },
          { label: 'รอทดสอบ',  value: stats.pending, color: '#d46b08', bg: '#fff7e6' },
        ].map(({ label, value, color, bg }) => (
          <Col xs={12} sm={6} key={label}>
            <Card size="small" style={{ background: bg, border: 'none', borderRadius: 10, textAlign: 'center' }}>
              <Statistic
                title={<span style={{ color, fontSize: 13, fontWeight: 600 }}>{label}</span>}
                value={value}
                valueStyle={{ color, fontSize: 28, fontWeight: 700 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* สรุปผลการทดสอบแยกตามระบบงาน */}
      {systemSummary.length > 0 && (
        <Card
          title={<span><ExperimentOutlined style={{ color: '#1a1f5e', marginRight: 8 }} />สรุปผลการทดสอบแยกตามระบบงาน</span>}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={systemSummary}
            rowKey="system"
            pagination={false}
            size="small"
            bordered
            columns={[
              { title: 'ระบบงาน', dataIndex: 'system', width: 280,
                render: v => <Text strong style={{ color: '#1a1f5e' }}>{v}</Text> },
              { title: 'จำนวน TC', dataIndex: 'total', width: 100, align: 'center',
                render: v => <strong>{v}</strong> },
              { title: 'PASS', dataIndex: 'pass', width: 100, align: 'center',
                render: v => <Tag color="success">{v}</Tag> },
              { title: 'FAIL', dataIndex: 'fail', width: 100, align: 'center',
                render: v => <Tag color={v > 0 ? 'error' : 'default'}>{v}</Tag> },
              { title: 'รอทดสอบ', dataIndex: 'pending', width: 100, align: 'center',
                render: v => <Tag color={v > 0 ? 'warning' : 'default'}>{v}</Tag> },
              {
                title: 'อัตราผ่าน (%)', dataIndex: 'passRate', width: 220,
                render: (v, r) => (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: v === 100 ? '#52c41a' : v >= 80 ? '#faad14' : '#f5222d', fontWeight: 700 }}>{v}%</span>
                      <span style={{ color: '#888' }}>{r.pass}/{r.total}</span>
                    </div>
                    <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height: 8, marginTop: 2 }}>
                      {r.pass    > 0 && <div style={{ flex: r.pass,    background: '#52c41a' }} />}
                      {r.fail    > 0 && <div style={{ flex: r.fail,    background: '#f5222d' }} />}
                      {r.pending > 0 && <div style={{ flex: r.pending, background: '#d9d9d9' }} />}
                    </div>
                  </div>
                ),
              },
            ]}
            summary={() => {
              const t = systemSummary.reduce((acc, s) => ({
                total: acc.total + s.total, pass: acc.pass + s.pass,
                fail: acc.fail + s.fail, pending: acc.pending + s.pending,
              }), { total: 0, pass: 0, fail: 0, pending: 0 });
              const rate = t.total ? Math.round((t.pass / t.total) * 100) : 0;
              return (
                <Table.Summary.Row style={{ background: '#f0f5ff', fontWeight: 700 }}>
                  <Table.Summary.Cell index={0}>รวมทั้งหมด</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="center"><strong>{t.total}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="center"><Tag color="success"><strong>{t.pass}</strong></Tag></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="center"><Tag color={t.fail > 0 ? 'error' : 'default'}><strong>{t.fail}</strong></Tag></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="center"><Tag color={t.pending > 0 ? 'warning' : 'default'}><strong>{t.pending}</strong></Tag></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="center">
                    <strong style={{ color: rate === 100 ? '#52c41a' : rate >= 80 ? '#faad14' : '#f5222d', fontSize: 16 }}>{rate}%</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </Card>
      )}

      {/* Filter bar */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Space wrap>
          <FilterOutlined style={{ color: '#1a1f5e' }} />
          <Text strong>กรองข้อมูล:</Text>
          <Select allowClear placeholder="ระบบงาน" style={{ width: 280 }} options={systemOptions}
            value={filterModule} onChange={setFilterModule} showSearch optionFilterProp="label" />
          <Select allowClear placeholder="สถานะ" style={{ width: 140 }} options={TC_STATUS}
            value={filterStatus} onChange={setFilterStatus} />
          <Input.Search placeholder="ค้นหา TC No. / ชื่อ / ผู้ทดสอบ..." style={{ width: 240 }} allowClear
            value={searchText} onChange={e => setSearchText(e.target.value)} />
          {(filterModule || filterMain || filterStatus || searchText) && (
            <Button size="small" onClick={() => {
              setFilterModule(null); setFilterMain(null);
              setFilterStatus(null); setSearchText('');
            }}>ล้างตัวกรอง</Button>
          )}
          <Text type="secondary">พบ {filteredTC.length} Test Case</Text>
        </Space>
      </Card>

      {/* Table */}
      <Table
        dataSource={filteredTC}
        columns={columns}
        rowKey="key"
        scroll={{ x: 1500 }}
        bordered
        size="middle"
        expandable={{
          expandedRowRender,
          rowExpandable: r => (r.steps?.length ?? 0) > 0 || !!r.actualResult || !!r.precondition,
        }}
        pagination={{
          current: currentPage,
          pageSize: PAGE_SIZE,
          total: filteredTC.length,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}–${range[1]} จาก ${total} Test Case`,
        }}
        rowClassName={r => r.status === 'fail' ? 'tc-row-fail' : r.status === 'pass' ? 'tc-row-pass' : ''}
      />

      {/* ── Add/Edit Modal ── */}
      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={handleOk}
        confirmLoading={saving}
        title={editing ? `แก้ไข Test Case – ${editing.tcNo}` : 'เพิ่ม Test Case ใหม่'}
        okText="บันทึก"
        cancelText="ยกเลิก"
        width={740}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>

          {/* TC info */}
          <Divider orientation="left" style={{ margin: '4px 0 12px', fontSize: 13, color: '#1a1f5e' }}>
            ข้อมูล Test Case
          </Divider>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="tcNo" label="TC No." style={{ width: 130 }}
              rules={[{ required: true, message: 'กรุณาระบุ TC No.' }]}>
              <Input placeholder="TC-001" />
            </Form.Item>
            <Form.Item name="module" label="ระบบงาน" style={{ flex: 1 }}>
              <Select
                options={moduleOptions}
                placeholder="เลือกระบบงาน"
                showSearch allowClear
                onChange={(val) => {
                  // เมื่อเลือก module → set systemName เป็น label ของ module ด้วย
                  const sel = moduleOptions.find(o => o.value === val);
                  form.setFieldValue('systemName', sel?.label || null);
                }}
              />
            </Form.Item>
          </div>
          <Form.Item name="title" label="หัวข้อทดสอบ"
            rules={[{ required: true, message: 'กรุณากรอกหัวข้อทดสอบ' }]}>
            <Input placeholder="เช่น 1.1 กำหนดข้อมูลหน่วยงาน - แสดงหน้าจอ" />
          </Form.Item>
          <Form.Item name="testUrl" label="URL ที่ทดสอบ">
            <Input placeholder="เช่น /mainsetting/organization" />
          </Form.Item>

          <Form.Item name="precondition" label="เงื่อนไขเบื้องต้น (Pre-condition)">
            <TextArea rows={2} placeholder="เช่น ต้องมีข้อมูลผู้จำหน่ายในระบบ, ยอดคงเหลือ > 0" />
          </Form.Item>

          {/* Steps */}
          <Divider orientation="left" style={{ margin: '4px 0 12px', fontSize: 13, color: '#1a1f5e' }}>
            ขั้นตอนการทดสอบ
          </Divider>

          <Form.List name="steps" rules={[{
            validator: async (_, items) => {
              if (!items || items.length === 0) return Promise.reject('กรุณาเพิ่มขั้นตอนอย่างน้อย 1 ขั้นตอน');
            }
          }]}>
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, name }, index) => (
                  <div key={key} style={{
                    background: '#fafafa', border: '1px solid #e8e8e8',
                    borderRadius: 8, padding: '10px 14px 4px', marginBottom: 8, position: 'relative',
                  }}>
                    <Text type="secondary" style={{ fontSize: 12, position: 'absolute', top: 8, left: 14 }}>
                      ขั้นตอนที่ {index + 1}
                    </Text>
                    {fields.length > 1 && (
                      <Tooltip title="ลบขั้นตอนนี้">
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ position: 'absolute', top: 10, right: 12, color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }}
                        />
                      </Tooltip>
                    )}
                    <div style={{ marginTop: 20 }}>
                      <Form.Item name={[name, 'action']} label="ขั้นตอนการทดสอบ" style={{ marginBottom: 8 }}
                        rules={[{ required: true, message: 'กรุณากรอกขั้นตอน' }]}>
                        <TextArea rows={2} placeholder={`ขั้นตอนที่ ${index + 1}: ระบุการทดสอบให้ละเอียด`} />
                      </Form.Item>
                    </div>
                  </div>
                ))}
                <Form.ErrorList errors={errors} />
                <Button type="dashed" onClick={() => add({ action: '' })}
                  icon={<PlusOutlined />} block style={{ marginBottom: 12 }}>
                  เพิ่มขั้นตอน
                </Button>
              </>
            )}
          </Form.List>

          {/* Result */}
          <Divider orientation="left" style={{ margin: '4px 0 12px', fontSize: 13, color: '#1a1f5e' }}>
            ผลการทดสอบ
          </Divider>

          <Form.Item name="actualResult" label="ผลที่คาดหวัง (Expected)">
            <TextArea rows={3} placeholder="ผลลัพธ์ที่ระบบควรแสดงหลังการทดสอบ..." />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="status" label="สถานะผลการทดสอบ" style={{ flex: 1 }}
              rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}>
              <Select options={TC_STATUS} />
            </Form.Item>
            <Form.Item name="tester" label="ผู้ทดสอบ" style={{ flex: 1 }}>
              <Input placeholder="ชื่อผู้ทดสอบ" />
            </Form.Item>
            <Form.Item name="testDate" label="วันที่ทดสอบ" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="เลือกวันที่" />
            </Form.Item>
          </div>

          <Form.Item name="remark" label="หมายเหตุ">
            <Input placeholder="ข้อมูลเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>
      <style>{`
        .tc-row-fail td { background: #fff1f0 !important; }
        .tc-row-pass td { background: #f6ffed !important; }
      `}</style>
    </div>
  </Spin>
  );
}
