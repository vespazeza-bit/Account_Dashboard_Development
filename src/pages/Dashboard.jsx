import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Empty, Spin, message, Button, Typography } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  BarChartOutlined, FileExcelOutlined, WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
import * as XLSX from 'xlsx';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, CategoryScale,
  LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { getFeatures, computeFeatureSummary, computeFeatureSummaryByModule } from '../utils/feature';
import { getModules } from '../utils/module';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MODULE_COLORS = [
  '#1890ff', '#faad14', '#52c41a', '#f5222d',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911',
];

export default function Dashboard() {
  const [features, setFeatures] = useState([]);
  const [modules,  setModules]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getFeatures(), getModules()])
      .then(([f, m]) => { setFeatures(f); setModules(m); })
      .catch(err => message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const { done, notDone, pending } = computeFeatureSummary(features);
  const byModule = computeFeatureSummaryByModule(features, modules);

  // สรุปข้อที่ทำไม่ได้แยกตามระบบงาน
  const notDoneByModule = (() => {
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.value] = m.label; });
    const grouped = {};
    features.forEach(f => {
      const notDoneDetails = (f.details || []).filter(d => d.status === 'notdone');
      if (notDoneDetails.length === 0) return;
      if (!grouped[f.module]) grouped[f.module] = { moduleLabel: moduleMap[f.module] || f.module, rows: [] };
      notDoneDetails.forEach(d => {
        grouped[f.module].rows.push({
          key:    `${f.key}_${d.detailId || Math.random()}`,
          main:   f.main,
          sub:    f.sub,
          detail: d.detail,
          reason: d.reason,
        });
      });
    });
    return Object.values(grouped).sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
  })();

  const total      = done + notDone + pending;
  const pctDone    = total ? Math.round((done    / total) * 100) : 0;
  const pctNotDone = total ? Math.round((notDone / total) * 100) : 0;

  const donutData = {
    labels: ['ทำได้', 'ทำไม่ได้', 'รอทดสอบ'],
    datasets: [{
      data: [done, notDone, pending],
      backgroundColor: ['#52c41a', '#f5222d', '#d9d9d9'],
      borderWidth: 2,
    }],
  };

  const barData = {
    labels: byModule.map(m => m.moduleLabel),
    datasets: [
      { label: 'ทำได้',    data: byModule.map(m => m.done),    backgroundColor: '#52c41a' },
      { label: 'ทำไม่ได้', data: byModule.map(m => m.notDone), backgroundColor: '#f5222d' },
      { label: 'รอทดสอบ',  data: byModule.map(m => m.pending), backgroundColor: '#d9d9d9' },
    ],
  };
  const barOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks: { stepSize: 1 }, beginAtZero: true },
    },
  };

  const tableColumns = [
    {
      title: 'ระบบงาน', dataIndex: 'moduleLabel', key: 'moduleLabel', width: 220,
      render: (v, _, i) => (
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: MODULE_COLORS[i % MODULE_COLORS.length], marginRight: 8 }} />
          {v}
        </span>
      ),
    },
    { title: 'ทำได้',    dataIndex: 'done',    key: 'done',    align: 'center', width: 80,  render: v => <Tag color="success">{v}</Tag> },
    { title: 'ทำไม่ได้', dataIndex: 'notDone', key: 'notDone', align: 'center', width: 90,  render: v => <Tag color="error">{v}</Tag>   },
    { title: 'รอทดสอบ',  dataIndex: 'pending', key: 'pending', align: 'center', width: 90,  render: v => <Tag color="default">{v}</Tag>  },
    { title: 'รวม',      dataIndex: 'total',   key: 'total',   align: 'center', width: 70,  render: v => <strong>{v}</strong>            },
    {
      title: 'ความก้าวหน้าการทดสอบ', key: 'progress', width: 260,
      render: (_, r) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: '#52c41a' }}>ทำได้ {r.pctDone}%</span>
            <span style={{ color: '#f5222d' }}>ทำไม่ได้ {r.pctNotDone}%</span>
          </div>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 14 }}>
            {r.done    > 0 && <div style={{ flex: r.done,    background: '#52c41a' }} />}
            {r.notDone > 0 && <div style={{ flex: r.notDone, background: '#f5222d' }} />}
            {r.pending > 0 && <div style={{ flex: r.pending, background: '#d9d9d9' }} />}
          </div>
        </div>
      ),
    },
    {
      title: '% ทำได้', dataIndex: 'pctDone', key: 'pctDone', align: 'center', width: 90,
      render: v => (
        <span style={{ fontWeight: 700, color: v === 100 ? '#52c41a' : v >= 50 ? '#faad14' : '#f5222d' }}>
          {v}%
        </span>
      ),
      sorter: (a, b) => a.pctDone - b.pctDone,
    },
  ];

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: สรุปรวม
    const summaryData = [
      ['สรุปผลการทดสอบระบบ'],
      [''],
      ['สถานะ', 'จำนวน (ข้อ)', 'คิดเป็น (%)'],
      ['ทำได้',    done,    pctDone],
      ['ทำไม่ได้', notDone, pctNotDone],
      ['รอทดสอบ',  pending, total ? Math.round((pending / total) * 100) : 0],
      ['รวมทั้งหมด', total, 100],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'สรุปรวม');

    // Sheet 2: แยกตามระบบงาน
    const moduleRows = [
      ['ระบบงาน', 'ทำได้', 'ทำไม่ได้', 'รอทดสอบ', 'รวม', '% ทำได้', '% ทำไม่ได้'],
      ...byModule.map(r => [r.moduleLabel, r.done, r.notDone, r.pending, r.total, r.pctDone + '%', r.pctNotDone + '%']),
      ['รวมทั้งหมด', done, notDone, pending, total, pctDone + '%', pctNotDone + '%'],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(moduleRows);
    ws2['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'แยกตามระบบงาน');

    const today = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    XLSX.writeFile(wb, `Dashboard_${today}.xlsx`);
    message.success('Export Excel สำเร็จ');
  };

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChartOutlined style={{ color: '#1a1f5e' }} /> Dashboard สรุปผลการทดสอบ
          </h2>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={exportExcel}
            disabled={total === 0}
            style={{ background: '#217346', borderColor: '#217346' }}
          >
            Export Excel
          </Button>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          {[
            { bg: '#1a1f5e', title: 'รวมทั้งหมด', val: total,   icon: null,                    suffix: 'ข้อ' },
            { bg: '#52c41a', title: 'ทำได้',       val: done,    icon: <CheckCircleOutlined />, suffix: 'ข้อ' },
            { bg: '#f5222d', title: 'ทำไม่ได้',    val: notDone, icon: <CloseCircleOutlined />, suffix: 'ข้อ' },
            { bg: '#faad14', title: 'รอทดสอบ',     val: pending, icon: <ClockCircleOutlined />, suffix: 'ข้อ' },
          ].map(({ bg, title, val, icon, suffix }) => (
            <Col span={6} key={title}>
              <Card style={{ background: bg, borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.75)' }}>{title}</span>}
                  value={val}
                  valueStyle={{ color: '#fff', fontSize: 34 }}
                  prefix={icon}
                  suffix={suffix}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>ความก้าวหน้าการทดสอบโดยรวม</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: pctDone === 100 ? '#52c41a' : '#1890ff' }}>{pctDone}%</span>
            {notDone > 0 && <span style={{ fontSize: 14, color: '#f5222d', fontWeight: 600 }}>| ทำไม่ได้ {pctNotDone}%</span>}
          </div>
          <Progress
            percent={pctDone + pctNotDone}
            success={{ percent: pctDone, strokeColor: '#52c41a' }}
            strokeColor="#f5222d" trailColor="#f0f0f0" strokeWidth={20}
            status={pctDone === 100 ? 'success' : 'active'}
            format={() => `ทำได้ ${pctDone}%`}
          />
          <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
            {[
              { color: '#52c41a', label: 'ทำได้',    val: `${done} ข้อ (${pctDone}%)` },
              { color: '#f5222d', label: 'ทำไม่ได้', val: `${notDone} ข้อ (${pctNotDone}%)` },
              { color: '#d9d9d9', label: 'รอทดสอบ',  val: `${pending} ข้อ` },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                <span style={{ fontSize: 13, color: '#555' }}>{item.label}: <strong>{item.val}</strong></span>
              </div>
            ))}
          </div>
        </Card>

        {total === 0 ? (
          <Empty description="ยังไม่มีข้อมูลคุณสมบัติ กรุณาเพิ่มข้อมูลในเมนู คุณสมบัติโปรแกรม" />
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card title="สัดส่วนสถานะการทดสอบ" style={{ height: '100%' }}>
                  <div style={{ maxWidth: 260, margin: '0 auto' }}>
                    <Doughnut data={donutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </Card>
              </Col>
              <Col span={16}>
                <Card title="สถานะการทดสอบแยกตามระบบงาน">
                  {byModule.length === 0 ? <Empty description="ไม่มีข้อมูล" /> : <Bar data={barData} options={barOptions} />}
                </Card>
              </Col>
            </Row>

            <Card title="สรุปความก้าวหน้าการทดสอบแยกตามระบบงาน" style={{ marginBottom: 24 }}>
              <Table
                dataSource={byModule} columns={tableColumns} rowKey="moduleValue"
                pagination={false} bordered size="middle"
                summary={() => (
                  <Table.Summary.Row style={{ background: '#f0f5ff' }}>
                    <Table.Summary.Cell index={0}><strong>รวมทั้งหมด</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center"><Tag color="success"><strong>{done}</strong></Tag></Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="center"><Tag color="error"><strong>{notDone}</strong></Tag></Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="center"><Tag color="default"><strong>{pending}</strong></Tag></Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center"><strong>{total}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      <Progress percent={pctDone} size="small" strokeColor="#52c41a" status={pctDone === 100 ? 'success' : 'active'} />
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="center">
                      <strong style={{ color: pctDone === 100 ? '#52c41a' : pctDone >= 50 ? '#faad14' : '#f5222d' }}>{pctDone}%</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>

            <Card
              title={
                <span>
                  <WarningOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                  สรุปข้อที่ทำไม่ได้ แยกตามระบบงาน
                  <Tag color="error" style={{ marginLeft: 8 }}>{notDone} ข้อ</Tag>
                </span>
              }
            >
              {notDoneByModule.length === 0 ? (
                <Empty description="ไม่มีข้อที่ทำไม่ได้" />
              ) : (
                notDoneByModule.map((mod, idx) => (
                  <div key={mod.moduleLabel} style={{ marginBottom: idx < notDoneByModule.length - 1 ? 24 : 0 }}>
                    <div style={{
                      background: '#fff2f0', border: '1px solid #ffccc7',
                      borderRadius: 6, padding: '6px 14px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <CloseCircleOutlined style={{ color: '#f5222d' }} />
                      <Text strong style={{ color: '#cf1322', fontSize: 14 }}>{mod.moduleLabel}</Text>
                      <Tag color="error" style={{ marginLeft: 'auto' }}>{mod.rows.length} ข้อ</Tag>
                    </div>
                    <Table
                      dataSource={mod.rows}
                      rowKey="key"
                      pagination={false}
                      size="small"
                      bordered
                      columns={[
                        { title: 'หัวข้อย่อยคุณสมบัติ', dataIndex: 'sub',    width: 240 },
                        { title: 'รายละเอียดความสามารถ', dataIndex: 'detail', width: 340, render: v => v || <Text type="secondary">-</Text> },
                        {
                          title: 'เหตุผลที่ทำไม่ได้', dataIndex: 'reason',
                          render: v => v
                            ? <Text style={{ color: '#cf1322' }}>{v}</Text>
                            : <Text type="secondary">-</Text>,
                        },
                      ]}
                    />
                  </div>
                ))
              )}
            </Card>
          </>
        )}
      </div>
    </Spin>
  );
}
