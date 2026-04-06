import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Progress, Tag, Table, Empty, Statistic, Spin, message, Tooltip } from 'antd';
import {
  CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, ProjectOutlined,
  CalendarOutlined, FlagOutlined, RocketOutlined,
} from '@ant-design/icons';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, Tooltip as ChartTooltip, Legend,
} from 'chart.js';
import dayjs from 'dayjs';
import { getSchedules, getScheduleSummaryByPhase } from '../utils/schedule';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const STATUS_TAG   = { done: 'success',  inprogress: 'processing', notstarted: 'default' };
const STATUS_LABEL = { done: 'เสร็จ', inprogress: 'ระหว่างดำเนินการ', notstarted: 'ยังไม่เริ่ม' };

const STATUS_COLOR = { done: '#52c41a', inprogress: '#1890ff', notstarted: '#bfbfbf' };
const DEADLINE     = dayjs('2026-04-24');
const INSTALL_DATE = dayjs('2026-04-27');

function ProjectTimeline({ phases }) {
  if (!phases || phases.length === 0) return null;

  const allStarts = phases.map(p => dayjs(p.minStart));
  const minDate   = allStarts.reduce((a, b) => a.isBefore(b) ? a : b);
  const maxDate   = INSTALL_DATE;
  const totalDays = maxDate.diff(minDate, 'day') || 1;

  const getPct   = (date) => Math.max(0, Math.min(100, dayjs(date).diff(minDate, 'day') / totalDays * 100));
  const getWidth = (s, e) => Math.max(2, getPct(e) - getPct(s));

  const deadlinePct = getPct(DEADLINE);
  const installPct  = getPct(INSTALL_DATE);

  // สถานะโดยรวมของแต่ละเฟส
  const phaseStatus = (p) => p.percentDone === 100 ? 'done' : p.inprogress > 0 ? 'inprogress' : 'notstarted';

  return (
    <Card
      title={<span><CalendarOutlined style={{ color: '#1a1f5e', marginRight: 8 }} />Project Timeline</span>}
      style={{ marginTop: 24 }}
    >
      {/* legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: '#52c41a', label: 'เสร็จแล้ว' },
          { color: '#1890ff', label: 'ระหว่างดำเนินการ' },
          { color: '#bfbfbf', label: 'ยังไม่เริ่ม' },
          { color: '#ff4d4f', label: `กำหนดส่ง ${DEADLINE.format('DD/MM/YYYY')}` },
          { color: '#fa8c16', label: `ติดตั้งระบบ ${INSTALL_DATE.format('DD/MM/YYYY')}` },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: item.color }} />
            <span style={{ fontSize: 12, color: '#555' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* แกนเวลา — บรรทัดเดียว label สลับบน/ล่าง */}
      <div style={{ position: 'relative', padding: '100px 0 100px' }}>

        {/* label บน (เฟสคู่) */}
        {phases.map((p, i) => {
          if (i % 2 !== 0) return null;
          const midPct = (getPct(p.minStart) + getPct(p.maxEnd)) / 2;
          const color  = STATUS_COLOR[phaseStatus(p)];
          return (
            <div key={p.phase + '_top'} style={{
              position: 'absolute', left: `${midPct}%`, bottom: 'calc(50% + 22px)',
              transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1f5e', whiteSpace: 'nowrap' }}>{p.phase}</div>
              <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                {dayjs(p.minStart).format('DD MMM YY')}–{dayjs(p.maxEnd).format('DD MMM YY')}
              </div>
              <Tag color={phaseStatus(p) === 'done' ? 'success' : phaseStatus(p) === 'inprogress' ? 'processing' : 'default'}
                style={{ fontSize: 10, marginTop: 2 }}>{p.percentDone}%</Tag>
              {/* เส้นเชื่อม */}
              <div style={{ width: 2, height: 16, background: color, margin: '4px auto 0' }} />
              {/* วงกลม */}
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: color, border: '2px solid #fff',
                boxShadow: `0 0 0 2px ${color}`,
                margin: '0 auto',
              }} />
            </div>
          );
        })}

        {/* label ล่าง (เฟสคี่) */}
        {phases.map((p, i) => {
          if (i % 2 === 0) return null;
          const midPct = (getPct(p.minStart) + getPct(p.maxEnd)) / 2;
          const color  = STATUS_COLOR[phaseStatus(p)];
          return (
            <div key={p.phase + '_bot'} style={{
              position: 'absolute', left: `${midPct}%`, top: 'calc(50% + 22px)',
              transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5,
            }}>
              {/* วงกลม */}
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: color, border: '2px solid #fff',
                boxShadow: `0 0 0 2px ${color}`,
                margin: '0 auto',
              }} />
              {/* เส้นเชื่อม */}
              <div style={{ width: 2, height: 16, background: color, margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1f5e', whiteSpace: 'nowrap' }}>{p.phase}</div>
              <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                {dayjs(p.minStart).format('DD MMM YY')}–{dayjs(p.maxEnd).format('DD MMM YY')}
              </div>
              <Tag color={phaseStatus(p) === 'done' ? 'success' : phaseStatus(p) === 'inprogress' ? 'processing' : 'default'}
                style={{ fontSize: 10, marginTop: 2 }}>{p.percentDone}%</Tag>
            </div>
          );
        })}

        {/* แถบหลัก 1 บรรทัด */}
        <div style={{ position: 'relative', height: 44 }}>
          {/* track background */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: '#e8e8e8', borderRadius: 22,
          }} />

          {/* แต่ละเฟส */}
          {phases.map((p) => {
            const left  = getPct(p.minStart);
            const width = getWidth(p.minStart, p.maxEnd);
            const color = STATUS_COLOR[phaseStatus(p)];
            return (
              <Tooltip key={p.phase} title={
                <div>
                  <div><strong>{p.phase}</strong></div>
                  <div>{dayjs(p.minStart).format('DD/MM/YYYY')} – {dayjs(p.maxEnd).format('DD/MM/YYYY')}</div>
                  <div>ความคืบหน้า: {p.percentDone}%</div>
                  <div>{STATUS_LABEL[phaseStatus(p)]}</div>
                </div>
              }>
                <div style={{
                  position: 'absolute',
                  left: `${left}%`, width: `${width}%`,
                  top: 2, height: 40,
                  background: color, borderRadius: 20,
                  opacity: 0.85, cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    color: '#000', fontSize: 11, fontWeight: 700,
                    whiteSpace: 'nowrap', padding: '0 10px',
                    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                  }}>{p.phase}</span>
                </div>
              </Tooltip>
            );
          })}

          {/* เส้น deadline */}
          <div style={{
            position: 'absolute', left: `${deadlinePct}%`,
            top: -8, height: 60, width: 2,
            background: '#ff4d4f', zIndex: 10,
          }}>
            <div style={{
              position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
              background: '#ff4d4f', color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
            }}><FlagOutlined /> {DEADLINE.format('DD/MM/YY')}</div>
          </div>

          {/* เส้น install */}
          <div style={{
            position: 'absolute', left: `${installPct}%`,
            top: -8, height: 60, width: 2,
            background: '#fa8c16', zIndex: 10,
          }}>
            <div style={{
              position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
              background: '#fa8c16', color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
            }}><RocketOutlined /> {INSTALL_DATE.format('DD/MM/YY')}</div>
          </div>
        </div>
      </div>

      {/* ตารางสรุปเฟส */}
      <div style={{ marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0f5ff' }}>
              {['เฟส', 'ช่วงเวลา', 'ความคืบหน้า', 'สถานะ', 'งานทั้งหมด', 'เสร็จ'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                  borderBottom: '1px solid #d6e4ff', color: '#1a1f5e', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phases.map((p, i) => {
              const st = phaseStatus(p);
              return (
                <tr key={p.phase} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[st], flexShrink: 0 }} />
                      <strong>{p.phase}</strong>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: '#555' }}>
                    {dayjs(p.minStart).format('DD/MM/YYYY')} – {dayjs(p.maxEnd).format('DD/MM/YYYY')}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', minWidth: 160 }}>
                    <Progress percent={p.percentDone} size="small"
                      strokeColor={p.percentDone === 100 ? '#52c41a' : '#1890ff'}
                      status={p.percentDone === 100 ? 'success' : 'active'} />
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <Tag color={STATUS_TAG[st]}>{STATUS_LABEL[st]}</Tag>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{p.total}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center', color: '#52c41a', fontWeight: 700 }}>{p.done}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* กล่องข้อมูลสำคัญ */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 200, background: '#fff2f0', border: '1px solid #ffccc7',
          borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <FlagOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#cf1322', fontSize: 14 }}>กำหนดส่งระบบ</div>
            <div style={{ color: '#555', fontSize: 13 }}>{DEADLINE.format('DD/MM/YYYY')} ({DEADLINE.diff(dayjs(), 'day')} วันที่เหลือ)</div>
          </div>
        </div>
        <div style={{
          flex: 1, minWidth: 200, background: '#fff7e6', border: '1px solid #ffd591',
          borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <RocketOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#d46b08', fontSize: 14 }}>ติดตั้งระบบ รพ.</div>
            <div style={{ color: '#555', fontSize: 13 }}>{INSTALL_DATE.format('DD/MM/YYYY')} ({INSTALL_DATE.diff(dayjs(), 'day')} วันที่เหลือ)</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

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

            <ProjectTimeline phases={phases} />

            <h3 style={{ fontWeight: 600, color: '#1a1f5e', marginBottom: 16, marginTop: 24 }}>รายละเอียดความก้าวหน้าแต่ละเฟส</h3>
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
                      onRow={r => r.status === 'done' ? { style: { background: '#f6ffed' } } : {}} />
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
