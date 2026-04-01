import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag,
  message, Space, Tooltip, Divider, Typography, Card, Spin, Upload, Image,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SettingOutlined, MinusCircleOutlined, FilterOutlined, BookOutlined,
  PaperClipOutlined, PictureOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { getFeatures, createFeature, updateFeature, deleteFeature } from '../utils/feature';
import { getModules, createModule, updateModule, deleteModule } from '../utils/module';
import { getMainTopics, createMainTopic, updateMainTopic, deleteMainTopic } from '../utils/maintopic';

const { Text } = Typography;

const STATUS = [
  { label: 'ทำได้',     value: 'done' },
  { label: 'ทำไม่ได้',  value: 'notdone' },
  { label: 'รอทดสอบ',  value: 'pending' },
  { label: 'แก้ไขแล้ว', value: 'fixed' },
];
const STATUS_COLOR = { done: 'success', notdone: 'error', pending: 'warning', fixed: 'gold' };
const STATUS_LABEL = { done: 'ทำได้', notdone: 'ทำไม่ได้', pending: 'รอทดสอบ', fixed: 'แก้ไขแล้ว' };

function normalize(f) {
  if (f.details) return f;
  return {
    ...f,
    details: [{ detail: f.detail ?? '', status: f.status ?? 'pending', reason: f.reason ?? '' }],
  };
}

function filterAndSort(features, filterModule, filterMain, searchText) {
  let list = features.map(normalize);
  if (filterModule) list = list.filter(f => f.module === filterModule);
  if (filterMain)   list = list.filter(f => f.main === filterMain);
  if (searchText) {
    const q = searchText.toLowerCase();
    list = list.filter(f =>
      f.main?.toLowerCase().includes(q) ||
      f.sub?.toLowerCase().includes(q) ||
      f.details?.some(d => d.detail?.toLowerCase().includes(q))
    );
  }
  list.sort((a, b) => {
    if (a.module !== b.module) return (a.module ?? '').localeCompare(b.module ?? '');
    if (a.main !== b.main)     return (a.main ?? '').localeCompare(b.main ?? '');
    return (a.sub ?? '').localeCompare(b.sub ?? '');
  });
  return list;
}

function summaryTags(details = []) {
  const c = { done: 0, notdone: 0, pending: 0, fixed: 0 };
  details.forEach(d => { if (c[d.status] !== undefined) c[d.status]++; });
  return (
    <Space size={4}>
      {c.done    > 0 && <Tag color="success">ทำได้ {c.done}</Tag>}
      {c.notdone > 0 && <Tag color="error">ทำไม่ได้ {c.notdone}</Tag>}
      {c.pending > 0 && <Tag color="warning">รอทดสอบ {c.pending}</Tag>}
      {c.fixed   > 0 && <Tag color="gold">แก้ไขแล้ว {c.fixed}</Tag>}
    </Space>
  );
}

export default function Features() {
  const [features,    setFeatures]   = useState([]);
  const [modules,     setModules]    = useState([]);
  const [mainTopics,  setMainTopics] = useState([]);
  const [loading,     setLoading]    = useState(true);

  const [filterModule, setFilterModule] = useState(null);
  const [filterMain,   setFilterMain]   = useState(null);
  const [searchText,   setSearchText]   = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const PAGE_SIZE = 20;

  const [featureModal, setFeatureModal] = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [featureForm]                   = Form.useForm();
  const [saving,       setSaving]       = useState(false);

  const [moduleModal,   setModuleModal]   = useState(false);
  const [moduleForm]                      = Form.useForm();
  const [editingModule, setEditingModule] = useState(null);

  const [topicModal,   setTopicModal]   = useState(false);
  const [topicForm]                     = Form.useForm();
  const [editingTopic, setEditingTopic] = useState(null);

  const [previewImage, setPreviewImage] = useState({ visible: false, src: '' });

  // ── โหลดข้อมูลครั้งแรก ───────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [f, m, t] = await Promise.all([getFeatures(), getModules(), getMainTopics()]);
      setFeatures(f.map(normalize));
      setModules(m);
      setMainTopics(t);
    } catch (err) {
      message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── filter options ────────────────────────────────────────────
  const mainOptions = useMemo(() => {
    const src = filterModule ? features.filter(f => f.module === filterModule) : features;
    return [...new Set(src.map(f => f.main).filter(Boolean))].map(v => ({ label: v, value: v }));
  }, [features, filterModule]);

  const filteredFeatures = useMemo(
    () => filterAndSort(features, filterModule, filterMain, searchText),
    [features, filterModule, filterMain, searchText]
  );

  useEffect(() => { setCurrentPage(1); }, [filterModule, filterMain, searchText]);

  // ── Feature CRUD ──────────────────────────────────────────────
  const openFeatureModal = async (record) => {
    setEditing(record || null);
    setFeatureModal(true);
    if (record) {
      // โหลดรูปภาพที่มีอยู่สำหรับแต่ละ detail
      const detailsWithImages = await Promise.all(
        (record.details || []).map(async (d) => {
          if (d.hasImage && d.detailId) {
            try {
              const { imageData } = await import('../utils/api').then(m =>
                m.api.get(`/feature-details/${d.detailId}/image`)
              );
              return { ...d, image: imageData };
            } catch { return { ...d, image: null }; }
          }
          return { ...d, image: null };
        })
      );
      featureForm.setFieldsValue({
        module:  record.module,
        main:    record.main,
        sub:     record.sub,
        version: record.version,
        tester:  record.tester,
        remark:  record.remark,
        details: detailsWithImages.length ? detailsWithImages : [{ detail: '', status: 'pending', reason: '', image: null }],
      });
    } else {
      featureForm.resetFields();
      featureForm.setFieldsValue({ details: [{ detail: '', status: 'pending', reason: '', image: null }] });
    }
  };

  const handleViewImage = async (detailId) => {
    try {
      const { api } = await import('../utils/api');
      const { imageData } = await api.get(`/feature-details/${detailId}/image`);
      setPreviewImage({ visible: true, src: imageData });
    } catch { message.error('โหลดรูปภาพไม่สำเร็จ'); }
  };

  const handleFeatureOk = async () => {
    try {
      await featureForm.validateFields();               // ตรวจสอบ required fields
      const values = featureForm.getFieldsValue(true);  // ดึงค่าทั้งหมด รวมถึง image ที่ไม่มี Form.Item
      setSaving(true);
      if (editing) {
        await updateFeature(editing.key, values);
      } else {
        await createFeature(values);
      }
      setFeatureModal(false);
      setEditing(null);
      message.success('บันทึกข้อมูลสำเร็จ');
      const fresh = await getFeatures();
      setFeatures(fresh.map(normalize));
    } catch (err) {
      if (err?.errorFields) return; // form validation error
      message.error('บันทึกไม่สำเร็จ: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleDeleteFeature = (feature) => {
    Modal.confirm({
      title: 'ยืนยันการลบ',
      content: `ต้องการลบ "${feature.main} – ${feature.sub}" ใช่หรือไม่?`,
      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteFeature(feature.key);
          message.success('ลบข้อมูลสำเร็จ');
          setFeatures(prev => prev.filter(f => f.key !== feature.key));
        } catch (err) { message.error('ลบไม่สำเร็จ: ' + err.message); }
      },
    });
  };

  // ── Main Topic CRUD ───────────────────────────────────────────
  const openTopicModal = () => { setEditingTopic(null); topicForm.resetFields(); setTopicModal(true); };
  const openEditTopic  = (t)  => { setEditingTopic(t); topicForm.setFieldsValue({ module: t.module, label: t.label }); };

  const handleSaveTopic = async () => {
    try {
      const { module, label } = await topicForm.validateFields();
      const trimLabel = label.trim();
      if (mainTopics.some(t => t.module === module && t.label === trimLabel && t.key !== editingTopic?.key)) {
        message.error('หัวข้อหลักนี้มีอยู่แล้วในระบบงานนี้'); return;
      }
      if (editingTopic) {
        await updateMainTopic(editingTopic.key, module, trimLabel);
        message.success('แก้ไขหัวข้อหลักสำเร็จ');
      } else {
        const key = `mt_${Date.now()}`;
        await createMainTopic(key, module, trimLabel);
        message.success('เพิ่มหัวข้อหลักสำเร็จ');
      }
      setEditingTopic(null); topicForm.resetFields();
      const fresh = await getMainTopics();
      setMainTopics(fresh);
    } catch (err) {
      if (err?.errorFields) return;
      message.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  const handleDeleteTopic = (topic) => {
    Modal.confirm({
      title: 'ยืนยันการลบ', content: `ต้องการลบ "${topic.label}" ใช่หรือไม่?`,
      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteMainTopic(topic.key);
          setMainTopics(prev => prev.filter(t => t.key !== topic.key));
          message.success('ลบหัวข้อหลักสำเร็จ');
        } catch (err) { message.error('ลบไม่สำเร็จ: ' + err.message); }
      },
    });
  };

  // ── Module CRUD ───────────────────────────────────────────────
  const openEditModule = (mod) => { setEditingModule(mod); moduleForm.setFieldsValue({ label: mod.label }); };

  const handleSaveModule = async () => {
    try {
      const { label } = await moduleForm.validateFields();
      const trimLabel = label.trim();
      if (editingModule) {
        await updateModule(editingModule.value, trimLabel);
        message.success('แก้ไขระบบงานสำเร็จ');
      } else {
        const value = `mod_${Date.now()}`;
        await createModule(value, trimLabel);
        message.success('เพิ่มระบบงานสำเร็จ');
      }
      setEditingModule(null); moduleForm.resetFields();
      const fresh = await getModules();
      setModules(fresh);
    } catch (err) {
      if (err?.errorFields) return;
      message.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  const handleDeleteModule = (mod) => {
    Modal.confirm({
      title: 'ยืนยันการลบระบบงาน', content: `ต้องการลบ "${mod.label}" ใช่หรือไม่?`,
      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteModule(mod.value);
          setModules(prev => prev.filter(m => m.value !== mod.value));
        } catch (err) { message.error('ลบไม่สำเร็จ: ' + err.message); }
      },
    });
  };

  // ── Columns ───────────────────────────────────────────────────
  const columns = [
    {
      title: 'ระบบงาน', dataIndex: 'module', width: 180,
      render: v => <Text strong style={{ color: '#1a1f5e' }}>{modules.find(m => m.value === v)?.label ?? v}</Text>,
    },
    { title: 'หัวข้อหลัก', dataIndex: 'main', width: 180 },
    { title: 'หัวข้อย่อย', dataIndex: 'sub', width: 250 },
    {
      title: 'สรุปสถานะ', key: 'summary', width: 230,
      render: (_, r) => summaryTags(r.details),
    },
    {
      title: 'รายละเอียด', key: 'detailCount', width: 90, align: 'center',
      render: (_, r) => <Tag>{r.details?.length ?? 0} ข้อ</Tag>,
    },
    { title: 'รุ่นโปรแกรม', dataIndex: 'version', width: 110 },
    { title: 'ผู้ทดสอบ',    dataIndex: 'tester',  width: 110 },
    { title: 'หมายเหตุ',    dataIndex: 'remark',  width: 130, ellipsis: true },
    {
      title: '', key: 'action', width: 90, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="แก้ไข"><Button icon={<EditOutlined />} size="small" onClick={() => openFeatureModal(r)} /></Tooltip>
          <Tooltip title="ลบ"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteFeature(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  // ข้อ(48) + รายละเอียด(610) = 658 = expand_icon(48)+ระบบงาน(180)+หัวข้อหลัก(180)+หัวข้อย่อย(250)
  // → ทำให้ "สถานะ" ตรงกับ "สรุปสถานะ" ของ parent row
  const detailColumns = [
    { title: 'ข้อ', key: 'no', width: 48, align: 'center', render: (_, __, i) => i + 1 },
    { title: 'รายละเอียดความสามารถ', dataIndex: 'detail', width: 610 },
    {
      title: 'สถานะ', dataIndex: 'status', width: 230,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    { title: 'เหตุผล (ถ้าทำไม่ได้)', dataIndex: 'reason', width: 340, render: v => v || <Text type="secondary">-</Text> },
    {
      title: 'รูปภาพ', key: 'image', width: 100, align: 'center',
      render: (_, record) => record.hasImage ? (
        <Button icon={<PictureOutlined />} size="small" type="link"
          onClick={() => handleViewImage(record.detailId)}>ดูรูป</Button>
      ) : null,
    },
  ];

  const expandedRowRender = (record) => (
    <Table
      columns={detailColumns}
      dataSource={(record.details || []).map((d, i) => ({ ...d, key: i }))}
      pagination={false} size="small" bordered style={{ margin: '0 0 8px 0' }}
      rowClassName={(row) => {
        if (row.status === 'done')    return 'row-done';
        if (row.status === 'notdone') return 'row-notdone';
        return '';
      }}
      components={{
        table: (props) => <table {...props} style={{ ...props.style, tableLayout: 'fixed', width: '100%' }} />,
      }}
    />
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>กำหนดคุณสมบัติโปรแกรม</h2>
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setModuleModal(true)}>จัดการระบบงาน</Button>
            <Button icon={<BookOutlined />} onClick={openTopicModal}>จัดการหัวข้อหลัก</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openFeatureModal(null)}>เพิ่มคุณสมบัติ</Button>
          </Space>
        </div>

        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Space wrap>
            <FilterOutlined style={{ color: '#1a1f5e' }} />
            <Text strong>กรองข้อมูล:</Text>
            <Select allowClear placeholder="ระบบงาน" style={{ width: 220 }} options={modules}
              value={filterModule} onChange={v => { setFilterModule(v); setFilterMain(null); }} />
            <Select allowClear placeholder="หัวข้อหลัก" style={{ width: 200 }} options={mainOptions}
              value={filterMain} onChange={setFilterMain} disabled={mainOptions.length === 0} />
            <Input.Search placeholder="ค้นหา..." style={{ width: 200 }} allowClear
              value={searchText} onChange={e => setSearchText(e.target.value)} />
            {(filterModule || filterMain || searchText) && (
              <Button size="small" onClick={() => { setFilterModule(null); setFilterMain(null); setSearchText(''); }}>
                ล้างตัวกรอง
              </Button>
            )}
            <Text type="secondary">พบ {filteredFeatures.length} หัวข้อย่อย</Text>
          </Space>
        </Card>

        <Table
          dataSource={filteredFeatures}
          columns={columns}
          rowKey="key"
          scroll={{ x: 1400 }}
          bordered
          size="middle"
          expandable={{
            expandedRowRender,
            rowExpandable: r => (r.details?.length ?? 0) > 0,
          }}
          pagination={{
            current: currentPage, pageSize: PAGE_SIZE,
            total: filteredFeatures.length, onChange: setCurrentPage,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}–${range[1]} จาก ${total} หัวข้อย่อย`,
          }}
        />

        {/* ── Feature modal ── */}
        <Modal open={featureModal} onCancel={() => setFeatureModal(false)} onOk={handleFeatureOk}
          title={editing ? 'แก้ไขคุณสมบัติ' : 'เพิ่มคุณสมบัติใหม่'} okText="บันทึก" cancelText="ยกเลิก"
          confirmLoading={saving}
          width={680} styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}>
          <Form form={featureForm} layout="vertical" style={{ marginTop: 8 }}>
            <Form.Item name="module" label="ระบบงาน" rules={[{ required: true, message: 'กรุณาเลือกระบบงาน' }]}>
              <Select options={modules} placeholder="เลือกระบบงาน" showSearch
                onChange={() => featureForm.setFieldValue('main', undefined)} />
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.module !== cur.module}>
              {() => {
                const sel = featureForm.getFieldValue('module');
                const opts = mainTopics.filter(t => t.module === sel).map(t => ({ label: t.label, value: t.label }));
                return (
                  <Form.Item name="main" label="หัวข้อหลักคุณสมบัติ" rules={[{ required: true, message: 'กรุณาเลือกหัวข้อหลัก' }]}>
                    <Select options={opts} placeholder={sel ? 'เลือกหัวข้อหลัก' : 'กรุณาเลือกระบบงานก่อน'}
                      disabled={!sel} showSearch
                      notFoundContent={<span style={{ color: '#999', fontSize: 13 }}>ไม่พบหัวข้อหลัก — กรุณาเพิ่มที่ปุ่ม "จัดการหัวข้อหลัก"</span>} />
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item name="sub" label="หัวข้อย่อยคุณสมบัติ" rules={[{ required: true, message: 'กรุณากรอกหัวข้อย่อย' }]}>
              <Input placeholder="เช่น บันทึกจ่ายเงินด้วยเช็ค" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="version" label="รุ่นโปรแกรม / Version" style={{ flex: 1 }}>
                <Input placeholder="เช่น v1.0.0" />
              </Form.Item>
              <Form.Item name="tester" label="ผู้ทดสอบ" style={{ flex: 1 }}>
                <Input placeholder="ชื่อผู้ทดสอบ" />
              </Form.Item>
            </div>

            <Divider orientation="left" style={{ margin: '8px 0 12px', fontSize: 13, color: '#1a1f5e' }}>
              รายละเอียดความสามารถ
            </Divider>

            <Form.List name="details" rules={[{
              validator: async (_, items) => {
                if (!items || items.length === 0) return Promise.reject('กรุณาเพิ่มรายละเอียดอย่างน้อย 1 ข้อ');
              }
            }]}>
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map(({ key, name }, index) => (
                    <Form.Item key={key} noStyle shouldUpdate>
                    {() => {
                      const status = featureForm.getFieldValue(['details', name, 'status']);
                      const bg     = status === 'done'    ? '#f6ffed'
                                   : status === 'notdone' ? '#fff2f0'
                                   : status === 'fixed'   ? '#fffbe6'
                                   : '#fafafa';
                      const border = status === 'done'    ? '1px solid #b7eb8f'
                                   : status === 'notdone' ? '1px solid #ffccc7'
                                   : status === 'fixed'   ? '1px solid #ffe58f'
                                   : '1px solid #e8e8e8';
                      return (
                    <div style={{
                      background: bg, border,
                      borderRadius: 8, padding: '12px 14px 4px', marginBottom: 10, position: 'relative',
                    }}>
                      <Text type="secondary" style={{ fontSize: 12, position: 'absolute', top: 8, left: 14 }}>
                        ข้อที่ {index + 1}
                      </Text>
                      {fields.length > 1 && (
                        <Tooltip title="ลบข้อนี้">
                          <MinusCircleOutlined onClick={() => remove(name)}
                            style={{ position: 'absolute', top: 10, right: 12, color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }} />
                        </Tooltip>
                      )}
                      <Form.Item name={[name, 'detail']} label=" " colon={false}
                        style={{ marginTop: 16, marginBottom: 8 }}
                        rules={[{ required: true, message: 'กรุณากรอกรายละเอียด' }]}>
                        <Input.TextArea rows={2} placeholder={`รายละเอียดความสามารถข้อที่ ${index + 1}`} />
                      </Form.Item>

                      {/* ── แนบรูปภาพ ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Upload accept="image/jpeg,image/png" maxCount={1} showUploadList={false}
                          beforeUpload={(file) => {
                            const ok = file.type === 'image/jpeg' || file.type === 'image/png';
                            if (!ok) { message.error('รองรับเฉพาะไฟล์ .jpg และ .png'); return false; }
                            const reader = new FileReader();
                            reader.onload = (e) => featureForm.setFieldValue(['details', name, 'image'], e.target.result);
                            reader.readAsDataURL(file);
                            return false;
                          }}>
                          <Button icon={<PaperClipOutlined />} size="small">แนบรูปภาพ</Button>
                        </Upload>
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const img = featureForm.getFieldValue(['details', name, 'image']);
                            return img ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <img src={img} alt="" onClick={() => setPreviewImage({ visible: true, src: img })}
                                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4,
                                    border: '1px solid #d9d9d9', cursor: 'pointer' }} />
                                <CloseCircleOutlined onClick={() => featureForm.setFieldValue(['details', name, 'image'], null)}
                                  style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 16 }} />
                              </div>
                            ) : null;
                          }}
                        </Form.Item>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <Form.Item name={[name, 'status']} label="สถานะ" style={{ flex: 1 }}
                          rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}>
                          <Select options={STATUS} placeholder="เลือกสถานะ" />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const status = featureForm.getFieldValue(['details', name, 'status']);
                            return status === 'notdone' ? (
                              <Form.Item name={[name, 'reason']} label="เหตุผลที่ทำไม่ได้" style={{ flex: 2 }}>
                                <Input placeholder="ระบุเหตุผล" />
                              </Form.Item>
                            ) : null;
                          }}
                        </Form.Item>
                      </div>
                    </div>
                      );
                    }}
                    </Form.Item>
                  ))}
                  <Form.ErrorList errors={errors} />
                  <Button type="dashed" onClick={() => add({ detail: '', status: 'pending', reason: '', image: null })}
                    icon={<PlusOutlined />} block style={{ marginBottom: 12 }}>
                    เพิ่มรายละเอียดความสามารถ
                  </Button>
                </>
              )}
            </Form.List>

            <Form.Item name="remark" label="หมายเหตุเพิ่มเติม">
              <Input.TextArea rows={2} placeholder="ข้อมูลเพิ่มเติมอื่น ๆ" />
            </Form.Item>
          </Form>
        </Modal>

        {/* ── Main Topic modal ── */}
        <Modal open={topicModal} onCancel={() => { setTopicModal(false); setEditingTopic(null); topicForm.resetFields(); }}
          footer={null} title={<span><BookOutlined style={{ marginRight: 8 }} />จัดการหัวข้อหลักคุณสมบัติ</span>} width={580}>
          <Form form={topicForm} layout="vertical" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Form.Item name="module" label="ระบบงาน" style={{ flex: 1 }} rules={[{ required: true, message: 'กรุณาเลือกระบบงาน' }]}>
                <Select options={modules} placeholder="เลือกระบบงาน" showSearch disabled={!!editingTopic} />
              </Form.Item>
              <Form.Item name="label" label="หัวข้อหลักคุณสมบัติ" style={{ flex: 2 }} rules={[{ required: true, message: 'กรุณากรอกหัวข้อหลัก' }]}>
                <Input placeholder="เช่น การบันทึกใบสำคัญจ่าย" />
              </Form.Item>
            </div>
            <Space>
              <Button type="primary" icon={editingTopic ? <EditOutlined /> : <PlusOutlined />} onClick={handleSaveTopic}>
                {editingTopic ? 'บันทึกการแก้ไข' : 'เพิ่มหัวข้อหลัก'}
              </Button>
              {editingTopic && <Button onClick={() => { setEditingTopic(null); topicForm.resetFields(); }}>ยกเลิก</Button>}
            </Space>
          </Form>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {modules.map(mod => {
              const modTopics = mainTopics.filter(t => t.module === mod.value);
              if (modTopics.length === 0) return null;
              return (
                <div key={mod.value} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1f5e', marginBottom: 6, padding: '2px 8px',
                    background: '#f0f5ff', borderRadius: 4, display: 'inline-block' }}>{mod.label}</div>
                  {modTopics.map(topic => (
                    <div key={topic.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', borderRadius: 8, marginBottom: 4,
                      background: editingTopic?.key === topic.key ? '#e6f4ff' : '#fafafa',
                      border: `1px solid ${editingTopic?.key === topic.key ? '#91caff' : '#f0f0f0'}`,
                    }}>
                      <Text style={{ fontSize: 14 }}>{topic.label}</Text>
                      <Space>
                        <Tooltip title="แก้ไข"><Button icon={<EditOutlined />} size="small" onClick={() => openEditTopic(topic)} /></Tooltip>
                        <Tooltip title="ลบ"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteTopic(topic)} /></Tooltip>
                      </Space>
                    </div>
                  ))}
                </div>
              );
            })}
            {mainTopics.length === 0 && (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>
                ยังไม่มีหัวข้อหลัก กรุณาเพิ่มด้านบน
              </Text>
            )}
          </div>
        </Modal>

        {/* ── Image preview ── */}
        <Image
          style={{ display: 'none' }}
          src={previewImage.src}
          preview={{
            visible: previewImage.visible,
            onVisibleChange: (v) => setPreviewImage(p => ({ ...p, visible: v })),
          }}
        />

        {/* ── Module modal ── */}
        <Modal open={moduleModal} onCancel={() => { setModuleModal(false); setEditingModule(null); moduleForm.resetFields(); }}
          footer={null} title={<span><SettingOutlined style={{ marginRight: 8 }} />จัดการระบบงาน</span>} width={560}>
          <Form form={moduleForm} layout="vertical" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Form.Item name="label" label="ชื่อระบบงาน" style={{ flex: 1 }} rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
                <Input placeholder="เช่น ระบบบัญชีแยกประเภท (GL)" />
              </Form.Item>
            </div>
            <Space>
              <Button type="primary" icon={editingModule ? <EditOutlined /> : <PlusOutlined />} onClick={handleSaveModule}>
                {editingModule ? 'บันทึกการแก้ไข' : 'เพิ่มระบบงาน'}
              </Button>
              {editingModule && <Button onClick={() => { setEditingModule(null); moduleForm.resetFields(); }}>ยกเลิก</Button>}
            </Space>
          </Form>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {modules.map(mod => (
              <div key={mod.value} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                background: editingModule?.value === mod.value ? '#e6f4ff' : '#fafafa',
                border: `1px solid ${editingModule?.value === mod.value ? '#91caff' : '#f0f0f0'}`,
              }}>
                <div>
                  <Text strong style={{ fontSize: 14 }}>{mod.label}</Text>
                </div>
                <Space>
                  <Tooltip title="แก้ไข"><Button icon={<EditOutlined />} size="small" onClick={() => openEditModule(mod)} /></Tooltip>
                  <Tooltip title="ลบ"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteModule(mod)} /></Tooltip>
                </Space>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    </Spin>
  );
}
