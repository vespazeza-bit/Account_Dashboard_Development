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

  // ── Derived options ──────────────────────────────────────────────
  const moduleOptions = useMemo(
    () => modules.map(m => ({ label: m.label, value: m.value })),
    [modules]
  );

  const mainOptions = useMemo(() => {
    const src = filterModule ? features.filter(f => f.module === filterModule) : features;
    return [...new Set(src.map(f => f.main).filter(Boolean))].map(v => ({ label: v, value: v }));
  }, [features, filterModule]);

  // Feature options for the form (by selected module)
  const formModuleWatch = Form.useWatch('module', form);
  const featureOptions = useMemo(() => {
    if (!formModuleWatch) return [];
    return features
      .filter(f => f.module === formModuleWatch)
      .map(f => ({
        label: `[${f.main}] ${f.sub}`,
        value: f.key,
      }));
  }, [features, formModuleWatch]);

  // Detail options for the form (by selected feature)
  const formFeatureWatch = Form.useWatch('featureKey', form);
  const detailOptions = useMemo(() => {
    if (!formFeatureWatch) return [];
    const feat = features.find(f => f.key === formFeatureWatch);
    return (feat?.details || []).map((d, i) => ({
      label: `ข้อ ${i + 1}: ${d.detail}`,
      value: i,
    }));
  }, [features, formFeatureWatch]);

  // ── Filtered test cases ──────────────────────────────────────────
  const filteredTC = useMemo(() => {
    let list = testCases;
    if (filterModule) {
      const featureKeysInModule = features.filter(f => f.module === filterModule).map(f => f.key);
      list = list.filter(tc => featureKeysInModule.includes(tc.featureKey));
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
        tc.tester?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [testCases, features, filterModule, filterMain, filterStatus, searchText]);

  useEffect(() => { setCurrentPage(1); }, [filterModule, filterMain, filterStatus, searchText]);

  // ── Summary stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = filteredTC.length;
    const pass    = filteredTC.filter(t => t.status === 'pass').length;
    const fail    = filteredTC.filter(t => t.status === 'fail').length;
    const pending = filteredTC.filter(t => t.status === 'pending').length;
    return { total, pass, fail, pending };
  }, [filteredTC]);

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
    form.setFieldsValue({ tcNo, status: 'pending', steps: [{ action: '', expected: '' }] });
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
    form.setFieldsValue({
      ...record,
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
      title: 'TC No.', dataIndex: 'tcNo', width: 100, fixed: 'left',
      render: v => <Text strong style={{ color: '#1a1f5e' }}>{v}</Text>,
    },
    {
      title: 'ระบบงาน', key: 'module', width: 140,
      render: (_, r) => getFeatureLabel(r.featureKey).module,
    },
    {
      title: 'หัวข้อหลัก', key: 'main', width: 150,
      render: (_, r) => getFeatureLabel(r.featureKey).main,
    },
    {
      title: 'หัวข้อย่อย', key: 'sub', width: 200,
      render: (_, r) => getFeatureLabel(r.featureKey).sub,
    },
    {
      title: 'รายละเอียดที่ทดสอบ', key: 'detail', width: 220,
      render: (_, r) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: getDetailLabel(r.featureKey, r.detailIndex) }}>
          {getDetailLabel(r.featureKey, r.detailIndex)}
        </Text>
      ),
    },
    {
      title: 'ชื่อ Test Case', dataIndex: 'title', width: 200,
      render: v => <Text ellipsis={{ tooltip: v }}>{v}</Text>,
    },
    {
      title: 'ขั้นตอน', key: 'steps', width: 80, align: 'center',
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
    { title: 'ผู้ทดสอบ',    dataIndex: 'tester',   width: 110 },
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
      { title: 'การกระทำ (Action)', dataIndex: 'action' },
      { title: 'ผลที่คาดหวัง (Expected)', dataIndex: 'expected' },
    ];
    return (
      <div style={{ padding: '8px 16px 16px' }}>
        {record.precondition && (
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ color: '#555', fontSize: 12 }}>เงื่อนไขเบื้องต้น: </Text>
            <Text style={{ fontSize: 13 }}>{record.precondition}</Text>
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
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '8px 12px' }}>
            <Text strong style={{ color: '#555', fontSize: 12, display: 'block', marginBottom: 4 }}>ผลจริงที่ได้:</Text>
            <Paragraph style={{ margin: 0, fontSize: 13 }}>{record.actualResult}</Paragraph>
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

      {/* Filter bar */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Space wrap>
          <FilterOutlined style={{ color: '#1a1f5e' }} />
          <Text strong>กรองข้อมูล:</Text>
          <Select allowClear placeholder="ระบบงาน" style={{ width: 200 }} options={moduleOptions}
            value={filterModule} onChange={v => { setFilterModule(v); setFilterMain(null); }} />
          <Select allowClear placeholder="หัวข้อหลัก" style={{ width: 180 }} options={mainOptions}
            value={filterMain} onChange={setFilterMain} disabled={mainOptions.length === 0} />
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
          {/* Link to feature */}
          <Divider orientation="left" style={{ margin: '0 0 12px', fontSize: 13, color: '#1a1f5e' }}>
            เชื่อมโยงกับคุณสมบัติโปรแกรม
          </Divider>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="module" label="ระบบงาน" style={{ flex: 1 }}
              rules={[{ required: true, message: 'กรุณาเลือกระบบงาน' }]}>
              <Select options={moduleOptions} placeholder="เลือกระบบงาน" showSearch
                onChange={() => { form.setFieldValue('featureKey', undefined); form.setFieldValue('detailIndex', undefined); }} />
            </Form.Item>
          </div>

          <Form.Item name="featureKey" label="หัวข้อย่อย (Feature)"
            rules={[{ required: true, message: 'กรุณาเลือกหัวข้อย่อย' }]}>
            <Select
              options={featureOptions}
              placeholder={formModuleWatch ? 'เลือกหัวข้อย่อย' : 'กรุณาเลือกระบบงานก่อน'}
              disabled={!formModuleWatch}
              showSearch
              optionFilterProp="label"
              onChange={() => form.setFieldValue('detailIndex', undefined)}
            />
          </Form.Item>

          <Form.Item name="detailIndex" label="รายละเอียดความสามารถที่ทดสอบ"
            rules={[{ required: true, message: 'กรุณาเลือกรายละเอียดที่ทดสอบ' }]}>
            <Select
              options={detailOptions}
              placeholder={formFeatureWatch ? 'เลือกรายละเอียด' : 'กรุณาเลือกหัวข้อย่อยก่อน'}
              disabled={!formFeatureWatch}
              optionFilterProp="label"
            />
          </Form.Item>

          {/* TC info */}
          <Divider orientation="left" style={{ margin: '4px 0 12px', fontSize: 13, color: '#1a1f5e' }}>
            ข้อมูล Test Case
          </Divider>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="tcNo" label="TC No." style={{ width: 130 }}
              rules={[{ required: true, message: 'กรุณาระบุ TC No.' }]}>
              <Input placeholder="TC-001" />
            </Form.Item>
            <Form.Item name="title" label="ชื่อ Test Case" style={{ flex: 1 }}
              rules={[{ required: true, message: 'กรุณากรอกชื่อ Test Case' }]}>
              <Input placeholder="เช่น ทดสอบบันทึกใบสำคัญจ่ายด้วยเงินสด" />
            </Form.Item>
          </div>

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
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                      <Form.Item name={[name, 'action']} label="การกระทำ (Action)" style={{ flex: 1, marginBottom: 8 }}
                        rules={[{ required: true, message: 'กรุณากรอกขั้นตอน' }]}>
                        <TextArea rows={2} placeholder={`ขั้นตอนที่ ${index + 1}: คลิกที่...`} />
                      </Form.Item>
                      <Form.Item name={[name, 'expected']} label="ผลที่คาดหวัง (Expected)" style={{ flex: 1, marginBottom: 8 }}
                        rules={[{ required: true, message: 'กรุณากรอกผลที่คาดหวัง' }]}>
                        <TextArea rows={2} placeholder="ระบบควรแสดง..." />
                      </Form.Item>
                    </div>
                  </div>
                ))}
                <Form.ErrorList errors={errors} />
                <Button type="dashed" onClick={() => add({ action: '', expected: '' })}
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

          <Form.Item name="actualResult" label="ผลจริงที่ได้ (Actual Result)">
            <TextArea rows={3} placeholder="บันทึกผลที่เกิดขึ้นจริงหลังการทดสอบ..." />
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
