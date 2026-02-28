import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  InputNumber,
  Row,
  Select,
  Slider,
  Space,
  Statistic,
  Typography,
  theme,
  Radio,
  Table,
} from 'antd';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { PQ2_MATERIALS, getMaterialById } from '../tools/pq2/materials';
import { EChart } from '../components/charts/EChart';
import type { EChartsOption } from 'echarts';
import type { PQ2MaterialId } from '../tools/pq2/types';

const { Title, Text } = Typography;

// --- 类型定义 ---
interface SimulationParams {
  materialId: PQ2MaterialId;
  productWeight: number; // g
  runnerWeight: number;  // g
  overflowWeight: number; // g
  plungerDiameter: number; // mm
  chamberLength: number; // mm
  initialFillRatio: number; // %
  runnerSectionArea: number; // mm2 (流道截面积)
  slowSpeed: number; // m/s
  fastSpeed: number; // m/s
  switchPosition: number; // mm (基于冲头起始点的绝对位置)
  // 速度控制模式
  speedControlMode: 'basic' | 'advanced';
  // 多段速度控制点 (基于冲头起始位置)
  speedPoints: Array<{ position: number; speed: number }>;
  slowMotionFactor: number;
  customDensity?: number; // kg/m³
}

type SimulationCalculations = {
  totalWeight: number;
  density: number;
  totalVolumeMm3: number;
  areaMm2: number;
  fillStrokeMm: number;
  fillRatio: number;
  materialName: string;
  runnerAreaMm2: number;
  runnerLengthMm: number;
  runnerVolumeMm3: number;
  moldAreaMm2: number;
  moldHeightMm: number;
  moldVolumeMm3: number;
  biscuitWeight: number;
  biscuitThicknessMm: number;
  warning: string;
  moldPartVolumeMm3: number;
  volumeCm3: number;
};

type ThemeToken = ReturnType<typeof theme.useToken>['token'];


const DEFAULT_PARAMS: SimulationParams = {
  materialId: 'ADC12',
  productWeight: 500,
  runnerWeight: 200,
  overflowWeight: 100,
  plungerDiameter: 60,
  chamberLength: 500,
  initialFillRatio: 40,
  runnerSectionArea: 300,
  slowSpeed: 0.3,
  fastSpeed: 3.0,
  switchPosition: 350,
  speedControlMode: 'basic',
  speedPoints: [
    { position: 0, speed: 0.2 },
    { position: 100, speed: 0.5 },
    { position: 200, speed: 1.0 },
    { position: 300, speed: 2.0 },
    { position: 400, speed: 3.0 },
  ],
  slowMotionFactor: 9,
  customDensity: 2650,
};

export const FillingSimulationPage: React.FC = () => {
  const { token } = theme.useToken();
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // --- 计算逻辑 ---
  const calculations = useMemo<SimulationCalculations>(() => {
    const material = getMaterialById(params.materialId);
    const density = (params.customDensity ?? material.densityKgM3) / 1000; // g/cm³
    
    // 压室几何计算
    const areaMm2 = Math.PI * Math.pow(params.plungerDiameter / 2, 2);
    const chamberVolumeMm3 = areaMm2 * params.chamberLength;
    
    // 基于充满度计算总金属液
    // 充满度 = 液体体积 / 压室体积
    // 液体体积 = 压室体积 * 充满度
    const totalVolumeMm3 = chamberVolumeMm3 * (params.initialFillRatio / 100);
    const totalWeight = (totalVolumeMm3 / 1000) * density;
    const volumeCm3 = totalVolumeMm3 / 1000;
    
    // 模具部分需求 (产品+流道+渣包)
    const moldPartWeight = params.productWeight + params.runnerWeight + params.overflowWeight;
    const moldPartVolumeMm3 = (moldPartWeight / density) * 1000;
    
    // 料饼计算
    // 料饼重量 = 总重量 - 模具部分重量
    const biscuitWeight = totalWeight - moldPartWeight;
    const biscuitVolumeMm3 = Math.max(0, biscuitWeight / density * 1000);
    const biscuitThicknessMm = biscuitVolumeMm3 / areaMm2;
    
    // 填充率 (填充长度 / 压室长度) - 这里的填充率指初始状态
    const fillRatio = params.initialFillRatio / 100;
    const fillStrokeMm = params.chamberLength * fillRatio; // 初始液面长度
    
    // 流道计算
    const runnerAreaMm2 = params.runnerSectionArea;
    const runnerVolumeMm3 = (params.runnerWeight / density) * 1000;
    const runnerLengthMm = runnerVolumeMm3 / runnerAreaMm2;

    // 型腔 + 渣包计算
    const moldWeight = params.productWeight + params.overflowWeight;
    const moldVolumeMm3 = (moldWeight / density) * 1000;
    // 假设型腔等效面积为压室面积的 0.8 倍 (简化可视化的假设)
    const moldAreaMm2 = areaMm2 * 0.8; 
    const moldHeightMm = moldVolumeMm3 / moldAreaMm2;
    
    // 警告信息
    let warning = '';
    if (biscuitWeight < 0) {
        warning = `金属液不足！缺口 ${(Math.abs(biscuitWeight)).toFixed(1)}g`;
    }

    return {
      totalWeight,
      density,
      totalVolumeMm3,
      areaMm2,
      fillStrokeMm,
      fillRatio,
      materialName: material.name,
      runnerAreaMm2,
      runnerLengthMm,
      runnerVolumeMm3,
      moldAreaMm2,
      moldHeightMm,
      moldVolumeMm3,
      biscuitWeight,
      biscuitThicknessMm,
      warning,
      moldPartVolumeMm3,
      volumeCm3
    };
  }, [params]);
  
  // 重置相关逻辑已移除，不再需要 handleFillRatioChange 反向计算
  // 但为了兼容，如果用户在 UI 上输入了充满度，直接更新 params.initialFillRatio 即可

  const handleReset = () => {
    setIsPlaying(false);
    setResetKey(prev => prev + 1);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // --- 图表配置 ---
  const chartOption: EChartsOption = useMemo(() => {
    // 重新实现图表数据的生成逻辑，确保与 SimulationPlayer 一致
    const totalLen = params.chamberLength;
    let data: number[][] = [];

    if (params.speedControlMode === 'basic') {
      const switchPosMm = params.switchPosition;
      data = [
        [0, 0], // 起始归零
        [0, params.slowSpeed],
        [switchPosMm, params.slowSpeed],
        [switchPosMm, params.fastSpeed],
        [totalLen, params.fastSpeed],
        [totalLen, 0] // 结束归零
      ];
    } else {
      const sortedPoints = [...params.speedPoints].sort((a, b) => a.position - b.position);
      data = [];
      
      // 确保从 0 位置开始绘制
      data.push([0, 0]); // 坐标轴起始
      
      let currentPos = 0;
      let currentSpeed = 0;
      
      if (sortedPoints.length > 0) {
        // 如果第一个点位置 > 0，则默认 0 到 第一个点位置之间使用第一个点的速度（或者0？通常是有初速度的，这里假设0位置就是第一个点的速度）
        // 按照阶跃逻辑：
        // 实际上压铸机设定通常是：Pos1 -> Speed1. 表示到达 Pos1 时，速度变为 Speed1?
        // 或者表示：在 Pos1 之前，速度是 Speed1?
        // 这里的逻辑采用：从 Pos[i] 开始，使用 Speed[i]，直到 Pos[i+1]
        
        // 处理 0 位置
        const firstP = sortedPoints[0];
        if (firstP.position > 0) {
            // 0 -> firstP.position 使用 firstP.speed
            data.push([0, firstP.speed]);
            data.push([firstP.position, firstP.speed]);
            currentPos = firstP.position;
            currentSpeed = firstP.speed;
        } else {
            // 0 位置有点
            data.push([0, firstP.speed]);
            currentPos = 0;
            currentSpeed = firstP.speed;
        }
        
        for (let i = 0; i < sortedPoints.length; i++) {
           const p = sortedPoints[i];
           // 如果当前点位置 > currentPos (比如循环到了下一个点)
           if (p.position > currentPos) {
              // 之前的速度保持到这里
              data.push([p.position, currentSpeed]);
              // 切换到新速度
              data.push([p.position, p.speed]);
              currentPos = p.position;
              currentSpeed = p.speed;
           } else if (p.position === currentPos) {
              // 覆盖当前速度
              currentSpeed = p.speed;
              // 更新数据点（如果已经是最后一点，可能需要更新）
              if (data.length > 0 && data[data.length-1][0] === p.position) {
                  data[data.length-1][1] = p.speed;
              } else {
                  data.push([p.position, p.speed]);
              }
           }
        }
        
        // 延续最后一个速度到压室末端
        if (currentPos < totalLen) {
            data.push([totalLen, currentSpeed]);
        }
      } else {
        data.push([totalLen, 0]);
      }
      
      data.push([totalLen, 0]); // 结束归零
    }

    return {
      title: { text: '冲头速度 vs 位置', left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          const value = Array.isArray(p.value) ? p.value : [p.value, 0];
          const x = Number(value[0] ?? 0);
          const y = Number(value[1] ?? 0);
          return `位置: ${x.toFixed(1)} mm<br/>速度: ${y.toFixed(2)} m/s`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { 
        type: 'value', 
        name: '位置 (mm)', 
        min: 0, 
        max: totalLen,
        nameLocation: 'middle',
        nameGap: 25
      },
      yAxis: { 
        type: 'value', 
        name: '速度 (m/s)',
        min: 0,
        max: Math.ceil(Math.max(...data.map(d => d[1]), 3.0) * 1.2) // 动态最大值
      },
      series: [
        {
          data: data,
          type: 'line',
          step: 'end', // 阶跃图
          areaStyle: { opacity: 0.1 },
          itemStyle: { color: token.colorPrimary },
          symbol: 'none' // 不显示点
        },
      ],
      animationDuration: 500,
    };
  }, [params, token]);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 顶部标题栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>
              <ThunderboltOutlined /> 压铸填充模拟
            </Title>
            <Text type="secondary">模拟金属液从压室到型腔的动态填充过程与工艺参数计算</Text>
          </div>
          <Space>
            <Button 
              type="primary" 
              size="large" 
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handlePlayPause}
              style={{ minWidth: 120 }}
            >
              {isPlaying ? '暂停' : '开始模拟'}
            </Button>
            <Button icon={<ReloadOutlined />} size="large" onClick={handleReset}>重置</Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* 左侧参数面板 */}
          <Col xs={24} lg={8}>
            <Card title="工艺参数设置" bordered={false} className="shadow-sm">
              <Form layout="vertical">
                <Divider style={{ marginTop: 0 }}>基础参数</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="材料">
                      <Select 
                        value={params.materialId}
                        onChange={v => {
                            const mat = getMaterialById(v);
                            setParams({...params, materialId: v, customDensity: mat.densityKgM3});
                        }}
                        options={PQ2_MATERIALS.map(m => ({ label: `${m.name} (${m.densityKgM3} kg/m³)`, value: m.id }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="密度 (kg/m³)">
                      <InputNumber
                        value={params.customDensity ?? getMaterialById(params.materialId).densityKgM3}
                        onChange={v => setParams({...params, customDensity: v ?? 0})}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="压室直径 (mm)">
                      <InputNumber 
                        style={{ width: '100%' }}
                        value={params.plungerDiameter}
                        onChange={v => setParams({...params, plungerDiameter: v || 60})}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="压室有效长度 (mm)">
                       <InputNumber 
                        style={{ width: '100%' }}
                        value={params.chamberLength}
                        onChange={v => setParams({...params, chamberLength: v || 500})}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="压室充满度 (%)">
                       <InputNumber 
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        precision={1}
                        value={params.initialFillRatio}
                        onChange={v => setParams({...params, initialFillRatio: v || 40})}
                        step={1}
                        addonAfter="%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item label="流道平均截面积 (mm²)">
                       <InputNumber 
                        style={{ width: '100%' }}
                        min={1}
                        value={params.runnerSectionArea}
                        onChange={v => setParams({...params, runnerSectionArea: v || 300})}
                       />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider>重量分布 (g)</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="产品">
                      <InputNumber 
                        style={{ width: '100%' }} 
                        value={params.productWeight}
                        onChange={v => setParams({...params, productWeight: v || 0})}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="流道">
                      <InputNumber 
                        style={{ width: '100%' }} 
                        value={params.runnerWeight}
                        onChange={v => setParams({...params, runnerWeight: v || 0})}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="渣包">
                      <InputNumber 
                        style={{ width: '100%' }} 
                        value={params.overflowWeight}
                        onChange={v => setParams({...params, overflowWeight: v || 0})}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider>速度控制</Divider>
                <div style={{ marginBottom: 16 }}>
                  <Radio.Group 
                    value={params.speedControlMode} 
                    onChange={e => setParams({...params, speedControlMode: e.target.value})}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="basic">两段式 (低/高)</Radio.Button>
                    <Radio.Button value="advanced">多段式 (高级)</Radio.Button>
                  </Radio.Group>
                </div>

                {params.speedControlMode === 'basic' ? (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="低速 (m/s)">
                          <InputNumber 
                            style={{ width: '100%' }}
                            step={0.1}
                            value={params.slowSpeed}
                            onChange={v => setParams({...params, slowSpeed: v || 0.3})}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="高速 (m/s)">
                          <InputNumber 
                            style={{ width: '100%' }}
                            step={0.1}
                            value={params.fastSpeed}
                            onChange={v => setParams({...params, fastSpeed: v || 3.0})}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label={`高速切换位置 (距起始点 ${params.switchPosition} mm)`}>
                       <Row gutter={8}>
                         <Col span={16}>
                           <Slider 
                            min={0} 
                            max={params.chamberLength} 
                            value={params.switchPosition}
                            onChange={v => setParams({...params, switchPosition: v})}
                            tooltip={{ formatter: (val) => `${val} mm` }}
                           />
                         </Col>
                         <Col span={8}>
                           <InputNumber
                            min={0}
                            max={params.chamberLength}
                            style={{ width: '100%' }}
                            value={params.switchPosition}
                            onChange={v => setParams({...params, switchPosition: v || 0})}
                           />
                         </Col>
                       </Row>
                    </Form.Item>
                  </>
                ) : (
                  <>
                    <Table
                      dataSource={params.speedPoints}
                      rowKey={(_, index) => index?.toString() || '0'}
                      pagination={false}
                      size="small"
                      bordered
                      columns={[
                        { title: '位置 (mm)', dataIndex: 'position', width: '40%', render: (val, _record, idx) => (
                           <InputNumber 
                             min={0} 
                             max={params.chamberLength} 
                             value={val} 
                             onChange={v => {
                               const newPoints = [...params.speedPoints];
                               newPoints[idx].position = v || 0;
                               setParams({...params, speedPoints: newPoints});
                             }} 
                             style={{width: '100%'}} 
                           />
                        )},
                        { title: '速度 (m/s)', dataIndex: 'speed', width: '40%', render: (val, _record, idx) => (
                           <InputNumber 
                             min={0} 
                             step={0.1}
                             value={val} 
                             onChange={v => {
                               const newPoints = [...params.speedPoints];
                               newPoints[idx].speed = v || 0;
                               setParams({...params, speedPoints: newPoints});
                             }} 
                             style={{width: '100%'}} 
                           />
                        )},
                        { title: '操作', width: '20%', render: (_, _record, idx) => (
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => {
                              const newPoints = params.speedPoints.filter((_, i) => i !== idx);
                              setParams({...params, speedPoints: newPoints});
                            }}
                          />
                        )}
                      ]}
                    />
                    <Button 
                      type="dashed" 
                      onClick={() => {
                        const newPoints = [...params.speedPoints, { position: 0, speed: 0.5 }];
                        setParams({...params, speedPoints: newPoints});
                      }} 
                      block 
                      icon={<PlusOutlined />}
                      style={{ marginTop: 8 }}
                    >
                      添加控制点
                    </Button>
                  </>
                )}
                <Form.Item label="慢动作倍率 (x)">
                  <Row gutter={8}>
                    <Col span={16}>
                      <Slider 
                        min={1} 
                        max={200} 
                        value={params.slowMotionFactor}
                        onChange={v => setParams({...params, slowMotionFactor: v ?? 1})}
                        tooltip={{ formatter: (val) => `${val}x` }}
                      />
                    </Col>
                    <Col span={8}>
                      <InputNumber
                        min={1}
                        max={200}
                        style={{ width: '100%' }}
                        value={params.slowMotionFactor}
                        onChange={v => setParams({...params, slowMotionFactor: v || 1})}
                      />
                    </Col>
                  </Row>
                </Form.Item>
              </Form>
            </Card>

            <Card title="计算结果" bordered={false} style={{ marginTop: 24 }} className="shadow-sm">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="总浇注重量" value={calculations.totalWeight} suffix="g" precision={1} />
                </Col>
                <Col span={12}>
                  <Statistic title="金属体积" value={calculations.volumeCm3} suffix="cm³" precision={1} />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic title="填充行程长度" value={calculations.fillStrokeMm} suffix="mm" precision={1} valueStyle={{ color: token.colorPrimary }} />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic title="压室充满度" value={params.initialFillRatio} suffix="%" precision={1} />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                   <Statistic 
                     title="预计料饼厚度" 
                     value={calculations.biscuitThicknessMm} 
                     suffix="mm" 
                     precision={1} 
                     valueStyle={{ color: calculations.biscuitWeight < 0 ? '#ff4d4f' : '#52c41a' }}
                   />
                   {calculations.warning && <Text type="danger" style={{ fontSize: 12 }}>{calculations.warning}</Text>}
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 右侧可视化面板 */}
          <Col xs={24} lg={16}>
             {/* 动画区域 */}
             <Card title="动态填充模拟" bordered={false} className="shadow-sm" style={{ marginBottom: 24 }}>
               <SimulationPlayer 
                key={resetKey}
                 params={params} 
                 calculations={calculations} 
                 isPlaying={isPlaying}
                 onFinished={() => setIsPlaying(false)}
                 themeToken={token}
               />
             </Card>
             
             {/* 速度曲线 */}
             <Card title="压射速度曲线" bordered={false} className="shadow-sm">
               <div style={{ height: 300 }}>
                 <EChart option={chartOption} />
               </div>
             </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

// --- 子组件：独立动画播放器 ---
const SimulationPlayer: React.FC<{
  params: SimulationParams;
  calculations: SimulationCalculations;
  isPlaying: boolean;
  onFinished: () => void;
  themeToken: ThemeToken;
}> = ({ params, calculations, isPlaying, onFinished, themeToken }) => {
  const [progress, setProgress] = useState(0);
  const [runnerProgress, setRunnerProgress] = useState(0);
  const [moldProgress, setMoldProgress] = useState(0);
  
  const uniqueId = useId().replace(/:/g, '');
  const liquidGradientId = `liquidGradient-${uniqueId}`;
  const chamberGradientId = `chamberGradient-${uniqueId}`;
  
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  
  // 尺寸定义
  const width = 800;
  const height = 550; // 增加高度以容纳垂直结构及下方标尺
  const chamberH = 60; // 压室高度
  const chamberW = 500; // 压室显示宽度
  const plungerW = 30;  // 冲头宽度
  
  const runnerW = 40; // 示意宽度，实际应根据 diameter 缩放，这里为了美观固定
  const runnerH = 150; // 流道高度 (示意)
  
  const moldW = 200; // 模具宽度
  const moldH = 120; // 模具高度
  
  // 动画状态 Ref
  const stateRef = useRef({
    chamberP: 0,
    runnerP: 0,
    moldP: 0
  });

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      return;
    }

    const loop = (time: number) => {
      const lastTime = lastTimeRef.current;
      if (lastTime === null) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      const deltaTime = time - lastTime; // ms
      lastTimeRef.current = time;

      const slowMotionFactor = params.slowMotionFactor; 
      
      const currentState = stateRef.current;
      
      // 计算当前冲头速度
      const currentPosMm = currentState.chamberP * params.chamberLength;
      let plungerSpeedMps = 0;
      
      if (params.speedControlMode === 'basic') {
        const switchPosMm = params.switchPosition;
        plungerSpeedMps = currentPosMm < switchPosMm ? params.slowSpeed : params.fastSpeed;
      } else {
        // Advanced Mode: Step function based on sorted points
        // Find the last point that is less than or equal to currentPosMm
        const points = params.speedPoints;
        // Assume points are sorted or sort them
        const sortedPoints = [...points].sort((a, b) => a.position - b.position);
        
        let targetSpeed = 0;
        if (sortedPoints.length > 0) {
           targetSpeed = sortedPoints[0].speed; // Default to first point speed
           for (let i = 0; i < sortedPoints.length; i++) {
             if (currentPosMm >= sortedPoints[i].position) {
               targetSpeed = sortedPoints[i].speed;
             } else {
               break; 
             }
           }
        }
        plungerSpeedMps = targetSpeed;
      }

      const plungerSpeedMmPerMs = plungerSpeedMps / slowMotionFactor;
      
      const stepMm = plungerSpeedMmPerMs * deltaTime; // 冲头推进一步的距离 (mm)
      
      // 根据阶段更新进度
      // 压室阶段：只要还没推到底，就继续推
      // 注意：金属液可能已经满了，开始进流道了。
      // 这里的逻辑：
      // 1. 冲头移动 -> 挤出体积 -> 填充流道 -> 填充型腔
      
      // 更新冲头位置
      let newChamberP = currentState.chamberP + (stepMm / params.chamberLength);
      
      // 停止条件：到达料饼厚度位置
      // 料饼厚度对应的进度是 calculations.biscuitThicknessMm / params.chamberLength
      // 停止点 = 1 - (biscuitThicknessMm / params.chamberLength)
      const stopP = 1 - (calculations.biscuitThicknessMm / params.chamberLength);
      
      // 如果计算出的料饼是负数（金属液不够），则还是允许推到底
      const actualStopP = Math.max(0.1, stopP > 1 ? 1 : stopP);
      
      if (newChamberP >= actualStopP) {
          newChamberP = actualStopP;
          onFinished();
      }
      
      stateRef.current.chamberP = newChamberP;
      setProgress(newChamberP);
      
      // 计算排出的体积
      // 总金属体积 calculations.totalVolumeMm3
      // 当前剩余空间体积 = (1 - newChamberP) * Area * Length
      // 如果剩余空间 < 金属体积，说明金属液被挤出去了
      
      const remainingChamberVol = (1 - newChamberP) * calculations.areaMm2 * params.chamberLength;
      const pushedOutVol = Math.max(0, calculations.totalVolumeMm3 - remainingChamberVol);
      
      // 填充流道
      if (pushedOutVol > 0) {
         const runnerVol = calculations.runnerVolumeMm3; // 用户设定的流道体积
         const rP = pushedOutVol / runnerVol;
         
         if (rP > 1) {
           // 流道满了，进型腔
           stateRef.current.runnerP = 1;
           setRunnerProgress(1);
           
           const moldVol = calculations.moldVolumeMm3;
           let mP = (pushedOutVol - runnerVol) / moldVol;
           if (mP > 1) mP = 1;
           
           stateRef.current.moldP = mP;
           setMoldProgress(mP);
         } else {
           stateRef.current.runnerP = rP;
           setRunnerProgress(rP);
         }
      }
      
      if (stateRef.current.chamberP < actualStopP) {
        requestRef.current = requestAnimationFrame(loop);
      }
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current !== null) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, params, onFinished, calculations]);

  // --- 渲染参数 ---
  const scale = chamberW / params.chamberLength;
  const plungerPosPx = progress * chamberW;
  
  // 压室液体
  // 逻辑：如果 pushedOutVol > 0，说明压室是满的（高度100%），长度 = 剩余长度
  // 如果 pushedOutVol == 0，说明还没充满，液体平铺
  const remainingChamberVol = (1 - progress) * calculations.areaMm2 * params.chamberLength;
  const isChamberFull = calculations.totalVolumeMm3 >= remainingChamberVol;
  
  let chamberLiquidLenPx = 0;
  let chamberLiquidHeightRatio = 0;
  
  if (isChamberFull) {
     chamberLiquidLenPx = chamberW - plungerPosPx;
     chamberLiquidHeightRatio = 1;
  } else {
     // 平铺
     chamberLiquidLenPx = chamberW - plungerPosPx;
     // 高度比 = 金属体积 / 剩余体积
     chamberLiquidHeightRatio = calculations.totalVolumeMm3 / remainingChamberVol;
     // 防止除以0
     if (remainingChamberVol <= 0.1) chamberLiquidHeightRatio = 1;
  }
  
  const chamberLiquidH = chamberH * Math.min(1, chamberLiquidHeightRatio);
  
  // 转换料饼位置
  const biscuitPx = (calculations.biscuitThicknessMm * scale);
  
  // 标尺数据生成
  const rulerTicks = useMemo(() => {
    const ticks = [];
    const step = 50; // 每50mm一个刻度
    const maxLen = params.chamberLength;
    for (let i = 0; i <= maxLen; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [params.chamberLength]);
  
  // 速度切换点数据
  const speedMarkers = useMemo(() => {
    if (params.speedControlMode === 'basic') {
       return [{ pos: params.switchPosition, label: '高速起点', speed: params.fastSpeed }];
    } else {
       // 多段速，排除 0 点
       return params.speedPoints
         .filter(p => p.position > 0)
         .sort((a,b) => a.position - b.position)
         .map(p => ({ pos: p.position, label: '', speed: p.speed }));
    }
  }, [params]);

  return (
    <div style={{ width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={liquidGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff7a45" />
            <stop offset="100%" stopColor="#ffec3d" />
          </linearGradient>
          <linearGradient id={chamberGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d9d9d9" />
            <stop offset="50%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#d9d9d9" />
          </linearGradient>
        </defs>
        
        {/* 坐标变换：原点设在左下角方便画图，还是用 translate */}
        {/* 整体下移，给上方型腔留空间 */}
        <g transform={`translate(50, 350)`}> 
        
          {/* --- 压室 Chamber (水平) --- */}
          <rect x={0} y={-10} width={chamberW} height={chamberH + 20} fill="#8c8c8c" rx={4} />
          <rect x={0} y={0} width={chamberW} height={chamberH} fill={`url(#${chamberGradientId})`} />
          
          {/* 基础参数标注 (压室上方) */}
          <g transform="translate(0, -35)">
             {/* 长度标注 (L) */}
             <line x1={0} y1={0} x2={chamberW} y2={0} stroke="#8c8c8c" strokeWidth={1} />
             <line x1={0} y1={-4} x2={0} y2={4} stroke="#8c8c8c" strokeWidth={1} />
             <line x1={chamberW} y1={-4} x2={chamberW} y2={4} stroke="#8c8c8c" strokeWidth={1} />
             <text x={chamberW / 2} y={-8} fontSize="12" fill={themeToken.colorTextSecondary} textAnchor="middle">
               L = {params.chamberLength}mm
             </text>
             
          </g>

          {/* 直径标注 (D) - 放在右侧，避免与冲头冲突 */}
          <g transform={`translate(${chamberW + 20}, ${chamberH / 2})`}>
            <line x1={0} y1={-chamberH / 2} x2={0} y2={chamberH / 2} stroke="#8c8c8c" strokeWidth={1} />
            <line x1={-4} y1={-chamberH / 2} x2={4} y2={-chamberH / 2} stroke="#8c8c8c" strokeWidth={1} />
            <line x1={-4} y1={chamberH / 2} x2={4} y2={chamberH / 2} stroke="#8c8c8c" strokeWidth={1} />
            
            {/* 引导线 */}
            <line x1={-20} y1={0} x2={0} y2={0} stroke="#8c8c8c" strokeWidth={1} strokeDasharray="2 2" />
            
            <text x={8} y={4} fontSize="12" fill={themeToken.colorTextSecondary} textAnchor="start">
              D = {params.plungerDiameter}mm
            </text>
          </g>
          
          {/* 切换点标记 */}
          {speedMarkers.map((m, idx) => (
             <g key={idx} transform={`translate(${m.pos * scale}, 0)`}>
               {/* 虚线延伸到底部标尺 */}
               <line y1={chamberH} y2={chamberH + 80} stroke="red" strokeWidth={1} strokeDasharray="4 2" />
               <text y={chamberH + 60} fontSize="10" textAnchor="middle" fill="red">
                 {m.label || `${m.pos}`}
               </text>
               <text y={chamberH + 75} fontSize="10" textAnchor="middle" fill="#ff4d4f">
                 {m.speed}m/s
               </text>
             </g>
          ))}

          {/* 冲头 */}
          <g transform={`translate(${plungerPosPx - plungerW}, 0)`}>
            <rect width={plungerW} height={chamberH} fill="#595959" stroke="#262626" strokeWidth={2} />
            <rect x={-200} y={chamberH/2 - 10} width={200} height={20} fill="#595959" />
          </g>
          
          {/* 压室内的金属液 */}
          {chamberLiquidLenPx > 0 && (
            <rect 
              x={plungerPosPx} 
              y={chamberH - chamberLiquidH} 
              width={chamberLiquidLenPx} 
              height={chamberLiquidH} 
              fill={`url(#${liquidGradientId})`} 
              opacity={0.9}
            />
          )}

          {/* 料饼位置参考线（淡色虚线） */}
          {calculations.biscuitThicknessMm > 0 && (
            <line 
              x1={chamberW - biscuitPx} 
              y1={0} 
              x2={chamberW - biscuitPx} 
              y2={chamberH} 
              stroke="#faad14" 
              strokeWidth={1} 
              strokeDasharray="2 2" 
              opacity={0.5}
            />
          )}
          
          {/* --- 流道 Runner (垂直) --- */}
          {/* 位于压室右端上方 */}
          <g transform={`translate(${chamberW - runnerW}, ${-runnerH})`}>
             {/* 外壳 */}
             <rect x={0} y={0} width={runnerW} height={runnerH} fill="none" stroke="#8c8c8c" strokeWidth={4} />
             {/* 遮挡底部线条，使其看起来连通 */}
             <rect x={4} y={runnerH - 4} width={runnerW - 8} height={8} fill={`url(#${chamberGradientId})`} /> 
             
             {/* 流道液体 */}
             {runnerProgress > 0 && (
               <rect 
                 x={2} 
                 y={runnerH * (1 - runnerProgress)} 
                 width={runnerW - 4} 
                 height={runnerH * runnerProgress} 
                 fill={`url(#${liquidGradientId})`} 
               />
             )}
          </g>
          
          {/* --- 型腔 Mold (上方) --- */}
          {/* 位于流道上方 */}
          <g transform={`translate(${chamberW - runnerW - (moldW - runnerW)/2}, ${-runnerH - moldH})`}>
             {/* 外壳 */}
             <rect x={0} y={0} width={moldW} height={moldH} fill="none" stroke="#595959" strokeWidth={4} rx={4} />
             
             {/* 遮挡底部连接处 */}
             <rect x={(moldW - runnerW)/2 + 4} y={moldH - 4} width={runnerW - 8} height={8} fill="#fff" />
             
             {/* 型腔液体 */}
             {moldProgress > 0 && (
               <rect 
                 x={4} 
                 y={moldH * (1 - moldProgress)} 
                 width={moldW - 8} 
                 height={moldH * moldProgress} 
                 fill={`url(#${liquidGradientId})`} 
                 opacity={0.9}
               />
             )}
             
             <text x={moldW/2} y={moldH/2} textAnchor="middle" fill="#999" fontSize="16">产品 + 渣包</text>
          </g>

          {/* --- 标尺 (位于最下方) --- */}
          <g transform={`translate(0, ${chamberH + 80})`}>
             <line x1={0} y1={0} x2={chamberW} y2={0} stroke="#595959" strokeWidth={1} />
             {rulerTicks.map(tick => (
               <g key={tick} transform={`translate(${tick * scale}, 0)`}>
                 <line y1={0} y2={5} stroke="#595959" strokeWidth={1} />
                 <text y={15} fontSize="10" textAnchor="middle" fill="#8c8c8c">{tick}</text>
               </g>
             ))}
             <text x={chamberW + 20} y={5} fontSize="10" fill="#8c8c8c">mm</text>
          </g>

        </g>
        
        {/* 文字标注 */}
        <text x={50} y={450} fontSize="14" fill={themeToken.colorTextSecondary}>压室 (Chamber)</text>
        <text x={50 + chamberW + 20} y={350 - runnerH/2} fontSize="14" fill={themeToken.colorTextSecondary}>流道</text>
        
      </svg>
    </div>
  );
};
