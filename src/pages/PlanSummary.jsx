import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Progress, Tag, Table, Empty, Statistic, Spin, message } from 'antd';
import {
  CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, ProjectOutlined,
} from '@ant-design/icons';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import dayjs from 'dayjs';
import { getSchedules, getScheduleSummaryByPhase } from '../utils/schedule';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const STATUS_TAG   = { done: 'success',  inprogress: 'processing', notstarted: 'default' };
const STATUS_LABEL = { done: 'เสร็จ', inprogress: 'ระหว่างดำเนินการ', notstarted: 'ยังไม่เริ่ม' };

export default function PlanSummary() {
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getSchedules()
      .then(setSchedules)
      .catch(err => message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const phases     = useMemo(() => getScheduleSummaryByPhase(schedules), [schedules]);
  const total      = schedules.length;
  const done       = schedules.filter(s => s.status === 'done').length;
  const inprogress = schedules.filter(s => s.status === 'inprogress').length;
  const notstarted = schedules.filter(s => s.status === 'notstarted').length;
  const pct        = total ? Math.round((done / total) * 100) : 0;

  const donutData = {
    labels: ['เสร็จ', 'ระหว่างดำเนินการ', 'ยังไม่เริ่ม'],
    datasets: [{
      data: [done, inprogress, notstarted],
      backgroundColor: ['#52c41a', '#1890ff', '#d9d9d9'],
      borderWidth: 2,
    }],
  };

  const barData = {
    labels: phases.map(p => p.phase),
    datasets: [
      { label: 'เสร็จ',            data: phases.map(p => p.done),       backgroundColor: '#52c41a' },
      { label: 'ระหว่างดำเนินการ', data: phases.map(p => p.inprogress), backgroundColor: '#1890ff' },
      { label: 'ยังไม่เริ่ม',      data: phases.map(p => p.notstarted), backgroundColor: '#d9d9d9' },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: { x: { stacked: true }, y: { stacked: true, ticks: { stepSize: 1 } } },
  };

  const taskColumns = [
    { title: 'รายละเอียด', dataIndex: 'detail', key: 'detail' },
    { title: 'วันที่เริ่ม', dataIndex: 'start', key: 'start', width: 110, render: v => dayjs(v).format('DD/MM/YYYY') },
    { title: 'วันสิ้นสุด', dataIndex: 'end',   key: 'end',   width: 110, render: v => dayjs(v).format('DD/MM/YYYY') },
    {
      title: 'สถานะ', dataIndex: 'status', key: 'status', width: 160,
      render: v => <Tag color={STATUS_TAG[v]}>{STATUS_LABEL[v]}</Tag>,
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <h2 style={styles.pageTitle}><ProjectOutlined style={{ marginRight: 8 }} />สรุปความก้าวหน้าแผนงาน</h2>

        {!loading && total === 0 ? (
          <Empty description="ยังไม่มีข้อมูลแผนงาน กรุณาเพิ่มข้อมูลในเมนู แผนงาน" style={{ marginTop: 80 }} />
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              {[
                { bg: '#1a1f5e', title: 'งานทั้งหมด',      val: total,      icon: <ProjectOutlined />,   suffix: 'งาน' },
                { bg: '#52c41a', title: 'เสร็จแล้ว',        val: done,       icon: <CheckCircleOutlined />, suffix: 'งาน' },
                { bg: '#1890ff', title: 'ระหว่างดำเนินการ', val: inprogress, icon: <SyncOutlined spin />,  suffix: 'งาน' },
                { bg: '#8c8c8c', title: 'ยังไม่เริ่ม',      val: notstarted, icon: <ClockCircleOutlined />, suffix: 'งาน' },
              ].map(({ bg, title, val, icon, suffix }) => (
                <Col span={6} key={title}>
                  <Card style={styles.statCard(bg)}>
                    <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>{title}</span>}
                      value={val} valueStyle={{ color: '#fff', fontSize: 36 }} prefix={icon} suffix={suffix} />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>ความก้าวหน้าโดยรวม</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: pct === 100 ? '#52c41a' : '#1890ff' }}>{pct}%</span>
              </div>
              <Progress percent={pct} strokeColor={{ '0%': '#1a1f5e', '100%': '#52c41a' }}
                trailColor="#f0f0f0" strokeWidth={16} status={pct === 100 ? 'success' : 'active'} />
            </Card>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card title="สัดส่วนสถานะงานทั้งหมด" style={{ height: '100%' }}>
                  <div style={{ maxWidth: 260, margin: '0 auto' }}>
                    <Doughnut data={donutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </Card>
              </Col>
              <Col span={16}>
                <Card title="จำนวนงานแยกตามเฟส">
                  <Bar data={barData} options={barOptions} />
                </Card>
              </Col>
            </Row>

            <h3 style={{ fontWeight: 600, color: '#1a1f5e', marginBottom: 16 }}>รายละเอียดความก้าวหน้าแต่ละเฟส</h3>
            <Row gutter={[16, 16]}>
              {phases.map(phase => (
                <Col span={24} key={phase.phase}>
                  <Card
                    style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{phase.phase}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Tag color="blue" style={{ fontSize: 12 }}>
                            {dayjs(phase.minStart).format('DD/MM/YYYY')} – {dayjs(phase.maxEnd).format('DD/MM/YYYY')}
                          </Tag>
                          <Tag color={phase.percentDone === 100 ? 'success' : 'processing'} style={{ fontSize: 12 }}>
                            {phase.percentDone}%
                          </Tag>
                        </div>
                      </div>
                    }
                  >
                    <Row gutter={16} style={{ marginBottom: 12 }}>
                      {[
                        { label: 'เสร็จ',            count: phase.done,       color: '#52c41a', icon: <CheckCircleOutlined /> },
                        { label: 'ระหว่างดำเนินการ', count: phase.inprogress, color: '#1890ff', icon: <SyncOutlined /> },
                        { label: 'ยังไม่เริ่ม',      count: phase.notstarted, color: '#8c8c8c', icon: <ClockCircleOutlined /> },
                        { label: 'รวมทั้งหมด',       count: phase.total,      color: '#1a1f5e', icon: <ProjectOutlined /> },
                      ].map(item => (
                        <Col span={6} key={item.label}>
                          <div style={{ textAlign: 'center', padding: '8px 0',
                            background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                            <div style={{ color: item.color, fontSize: 20, fontWeight: 700 }}>{item.count}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{item.label}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    <Progress percent={phase.percentDone} size="small"
                      strokeColor={phase.percentDone === 100 ? '#52c41a' : { '0%': '#1890ff', '100%': '#52c41a' }}
                      style={{ marginBottom: 12 }} status={phase.percentDone === 100 ? 'success' : 'active'} />
                    <Table dataSource={phase.tasks} columns={taskColumns} rowKey="key"
                      size="small" pagination={false} bordered
                      rowClassName={r => r.status === 'done' ? 'row-done' : ''} />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </div>
    </Spin>
  );
}

const styles = {
  pageTitle: { margin: '0 0 20px', color: '#1a1f5e', display: 'flex', alignItems: 'center' },
  statCard: (bg) => ({ background: bg, borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }),
};
