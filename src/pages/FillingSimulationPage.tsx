import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Card,
  Col,
  Row,
  Form,
  InputNumber,
  Select,
  Button,
  Statistic,
  Typography,
  Divider,
  theme,
  Space,
  Slider,
} from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PQ2_MATERIALS, getMaterialById } from '../tools/pq2/materials';
import { EChart } from '../components/charts/EChart';
import type { EChartsOption } from 'echarts';

const { Title, Text } = Typography;

// --- 类型定义 ---
interface SimulationParams {
  materialId: string;
  productWeight: number; // g
  runnerWeight: number;  // g
  overflowWeight: number; // g
  plungerDiameter: number; // mm
  chamberLength: number; // mm
  runnerDiameter: number; // mm (流道直径)
  slowSpeed: number; // m/s
  fastSpeed: number; // m/s
  switchPoint: number; // mm (距离压室末端的距离)
}

const DEFAULT_PARAMS: SimulationParams = {
  materialId: 'A380',
  productWeight: 500,
  runnerWeight: 200,
  overflowWeight: 100,
  plungerDiameter: 60,
  chamberLength: 500,
  runnerDiameter: 20,
  slowSpeed: 0.3,
  fastSpeed: 3.0,
  switchPoint: 150,
};

export const FillingSimulationPage: React.FC = () => {
  const { token } = theme.useToken();
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);

  // --- 计算逻辑 ---
  const calculations = useMemo(() => {
    const material = getMaterialById(params.materialId);
    const density = material.densityKgM3 / 1000; // g/cm³
    
    const totalWeight = params.productWeight + params.runnerWeight + params.overflowWeight;
    const volumeCm3 = totalWeight / density;
    const volumeMm3 = volumeCm3 * 1000;
    
    const areaMm2 = Math.PI * Math.pow(params.plungerDiameter / 2, 2);
    const fillStrokeMm = volumeMm3 / areaMm2; // 填充所需的行程长度
    
    // 填充率 (填充长度 / 压室长度)
    const fillRatio = Math.min(fillStrokeMm / params.chamberLength, 1);
    
    // 流道计算
    const runnerAreaMm2 = Math.PI * Math.pow(params.runnerDiameter / 2, 2);
    const runnerVolumeMm3 = (params.runnerWeight / density) * 1000;
    const runnerLengthMm = runnerVolumeMm3 / runnerAreaMm2;

    // 型腔 + 渣包计算
    const moldWeight = params.productWeight + params.overflowWeight;
    const moldVolumeMm3 = (moldWeight / density) * 1000;
    // 假设型腔等效面积为压室面积的 0.8 倍 (简化可视化的假设)
    const moldAreaMm2 = areaMm2 * 0.8; 
    const moldHeightMm = moldVolumeMm3 / moldAreaMm2;

    return {
      totalWeight,
      density,
      volumeCm3,
      areaMm2,
      fillStrokeMm,
      fillRatio,
      materialName: material.name,
      runnerAreaMm2,
      runnerLengthMm,
      runnerVolumeMm3,
      moldAreaMm2,
      moldHeightMm,
      moldVolumeMm3
    };
  }, [params]);

  // 处理压室填充百分比变化 -> 反向更新重量
  const handleFillRatioChange = (newRatioPercent: number | null) => {
    if (newRatioPercent === null || newRatioPercent <= 0) return;
    
    const targetRatio = newRatioPercent / 100;
    
    // 目标填充长度
    const targetStrokeMm = targetRatio * params.chamberLength;
    // 目标体积
    const targetVolumeMm3 = targetStrokeMm * calculations.areaMm2;
    // 目标总重 (g)
    const targetTotalWeight = (targetVolumeMm3 / 1000) * calculations.density;
    
    // 保持产品重量不变，按比例缩放流道和渣包
    const currentExtra = params.runnerWeight + params.overflowWeight;
    const targetExtra = targetTotalWeight - params.productWeight;
    
    if (targetExtra < 0) return; 

    if (currentExtra <= 0) {
       setParams({
         ...params,
         runnerWeight: Number(targetExtra.toFixed(1)),
         overflowWeight: 0
       });
    } else {
       const scale = targetExtra / currentExtra;
       setParams({
         ...params,
         runnerWeight: Number((params.runnerWeight * scale).toFixed(1)),
         overflowWeight: Number((params.overflowWeight * scale).toFixed(1))
       });
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setShouldReset(true);
    setTimeout(() => setShouldReset(false), 50);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // --- 图表配置 ---
  const chartOption: EChartsOption = useMemo(() => {
    const switchPosMm = params.chamberLength - params.switchPoint;
    const totalLen = params.chamberLength;
    
    const data: [number, number][] = [
      [0, 0],
      [0, params.slowSpeed],
      [switchPosMm, params.slowSpeed],
      [switchPosMm, params.fastSpeed],
      [totalLen, params.fastSpeed],
      [totalLen, 0]
    ];

    return {
      title: { text: '速度曲线 (v-s)', left: 'center' },
      tooltip: { trigger: 'axis' },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'value',
        name: '行程 (mm)',
        min: 0,
        max: totalLen,
      },
      yAxis: {
        type: 'value',
        name: '速度 (m/s)',
      },
      series: [
        {
          data: data,
          type: 'line',
          smooth: false,
          step: 'end',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: token.colorPrimary },
                { offset: 1, color: token.colorBgContainer }
              ]
            },
            opacity: 0.3
          },
          itemStyle: { color: token.colorPrimary },
          markLine: {
            data: [{ xAxis: switchPosMm, name: '切换点' }],
            lineStyle: { type: 'dashed', color: token.colorWarning }
          }
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
                <Divider orientation="left" style={{ marginTop: 0 }}>基础参数</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="材料">
                      <Select 
                        value={params.materialId}
                        onChange={v => setParams({...params, materialId: v})}
                        options={PQ2_MATERIALS.map(m => ({ label: m.name, value: m.id }))}
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
                        value={Number((calculations.fillRatio * 100).toFixed(1))}
                        onChange={handleFillRatioChange}
                        step={1}
                        addonAfter="%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item label="流道直径 (mm)">
                       <InputNumber 
                        style={{ width: '100%' }}
                        value={params.runnerDiameter}
                        onChange={v => setParams({...params, runnerDiameter: v || 20})}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">重量分布 (g)</Divider>
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

                <Divider orientation="left">速度控制</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="低速 (m/s)">
                      <InputNumber 
                        step={0.1}
                        style={{ width: '100%' }} 
                        value={params.slowSpeed}
                        onChange={v => setParams({...params, slowSpeed: v || 0.1})}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="高速 (m/s)">
                      <InputNumber 
                        step={0.5}
                        style={{ width: '100%' }} 
                        value={params.fastSpeed}
                        onChange={v => setParams({...params, fastSpeed: v || 1.0})}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={`高速切换点 (距末端 ${params.switchPoint} mm)`}>
                   <Slider 
                    min={0} 
                    max={params.chamberLength} 
                    value={params.switchPoint}
                    onChange={v => setParams({...params, switchPoint: v})}
                    tooltip={{ formatter: (val) => `${val} mm` }}
                   />
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
                  <Statistic title="压室充满度" value={calculations.fillRatio * 100} suffix="%" precision={1} />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 右侧可视化面板 */}
          <Col xs={24} lg={16}>
             {/* 动画区域 */}
             <Card title="动态填充模拟" bordered={false} className="shadow-sm" style={{ marginBottom: 24 }}>
               <SimulationPlayer 
                 params={params} 
                 calculations={calculations} 
                 isPlaying={isPlaying}
                 shouldReset={shouldReset}
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
  calculations: any;
  isPlaying: boolean;
  shouldReset: boolean;
  onFinished: () => void;
  themeToken: any;
}> = ({ params, calculations, isPlaying, shouldReset, onFinished, themeToken }) => {
  const [progress, setProgress] = useState(0); // 0 to 1 (in chamber)
  const [stage, setStage] = useState<'chamber' | 'runner' | 'mold'>('chamber');
  const [runnerProgress, setRunnerProgress] = useState(0); // 0 to 1
  const [moldProgress, setMoldProgress] = useState(0); // 0 to 1
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  
  // 尺寸定义
  const width = 800;
  const height = 400; // 增加高度以容纳垂直结构
  const chamberH = 60; // 压室高度
  const chamberW = 500; // 压室显示宽度
  const plungerW = 30;  // 冲头宽度
  
  const runnerW = 40; // 示意宽度，实际应根据 diameter 缩放，这里为了美观固定
  const runnerH = 150; // 流道高度 (示意)
  
  const moldW = 200; // 模具宽度
  const moldH = 120; // 模具高度
  
  // 动画状态 Ref
  const stateRef = useRef({
    stage: 'chamber' as 'chamber' | 'runner' | 'mold',
    chamberP: 0,
    runnerP: 0,
    moldP: 0
  });

  useEffect(() => {
    if (shouldReset) {
      stateRef.current = { stage: 'chamber', chamberP: 0, runnerP: 0, moldP: 0 };
      setProgress(0);
      setStage('chamber');
      setRunnerProgress(0);
      setMoldProgress(0);
    }
  }, [shouldReset]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = undefined;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const loop = (time: number) => {
      if (lastTimeRef.current === undefined) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      const deltaTime = time - lastTimeRef.current; // ms
      lastTimeRef.current = time;

      const SLOW_MOTION_FACTOR = 50; 
      
      const currentState = stateRef.current;
      
      // 计算当前冲头速度 (基准速度)
      const currentPosMm = currentState.chamberP * params.chamberLength;
      const switchPosMm = params.chamberLength - params.switchPoint;
      const plungerSpeedMps = currentPosMm < switchPosMm ? params.slowSpeed : params.fastSpeed;
      const plungerSpeedMmPerMs = plungerSpeedMps / SLOW_MOTION_FACTOR;
      
      const stepMm = plungerSpeedMmPerMs * deltaTime; // 冲头推进一步的距离 (mm)
      
      // 根据阶段更新进度
      if (currentState.stage === 'chamber') {
        // 压室阶段：只要还没推到底，就继续推
        // 注意：金属液可能已经满了，开始进流道了。
        // 这里的逻辑：
        // 1. 冲头移动 -> 挤出体积 -> 填充流道 -> 填充型腔
        
        // 更新冲头位置
        let newChamberP = currentState.chamberP + (stepMm / params.chamberLength);
        if (newChamberP >= 1) {
            newChamberP = 1;
            // 冲头到底了，通常意味着模拟结束，或者这里只是个演示
            // 实际上压铸冲头不会推到 100%，因为有余料饼
            // 我们假设推到 100% 仅仅为了演示完整过程
            onFinished();
        }
        
        stateRef.current.chamberP = newChamberP;
        setProgress(newChamberP);
        
        // 计算排出的体积
        // 总金属体积 calculations.volumeMm3
        // 当前剩余空间体积 = (1 - newChamberP) * Area * Length
        // 如果剩余空间 < 金属体积，说明金属液被挤出去了
        
        const remainingChamberVol = (1 - newChamberP) * calculations.areaMm2 * params.chamberLength;
        const pushedOutVol = Math.max(0, calculations.volumeMm3 - remainingChamberVol);
        
        // 填充流道
        if (pushedOutVol > 0) {
           const runnerVol = calculations.runnerVolumeMm3; // 用户设定的流道体积
           let rP = pushedOutVol / runnerVol;
           
           if (rP > 1) {
             // 流道满了，进型腔
             stateRef.current.runnerP = 1;
             stateRef.current.stage = 'mold'; // 其实是并行发生的，这里只是状态标记
             setRunnerProgress(1);
             setStage('mold');
             
             const moldVol = calculations.moldVolumeMm3;
             let mP = (pushedOutVol - runnerVol) / moldVol;
             if (mP > 1) mP = 1;
             
             stateRef.current.moldP = mP;
             setMoldProgress(mP);
           } else {
             stateRef.current.runnerP = rP;
             stateRef.current.stage = 'runner';
             setRunnerProgress(rP);
             setStage('runner');
           }
        }
      } 
      
      if (stateRef.current.chamberP < 1) {
        requestRef.current = requestAnimationFrame(loop);
      }
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, params, onFinished, calculations]);

  // --- 渲染参数 ---
  const scale = chamberW / params.chamberLength;
  const plungerPosPx = progress * chamberW;
  
  // 压室液体
  // 逻辑：如果 pushedOutVol > 0，说明压室是满的（高度100%），长度 = 剩余长度
  // 如果 pushedOutVol == 0，说明还没充满，液体平铺
  const remainingChamberVol = (1 - progress) * calculations.areaMm2 * params.chamberLength;
  const isChamberFull = calculations.volumeMm3 >= remainingChamberVol;
  
  let chamberLiquidLenPx = 0;
  let chamberLiquidHeightRatio = 0;
  
  if (isChamberFull) {
     chamberLiquidLenPx = chamberW - plungerPosPx;
     chamberLiquidHeightRatio = 1;
  } else {
     // 平铺
     chamberLiquidLenPx = chamberW - plungerPosPx;
     // 高度比 = 金属体积 / 剩余体积
     // 修正：应该是 金属体积 / (剩余长度 * 面积) -> 高度比
     // 如果没充满，金属体积 < 剩余体积
     chamberLiquidHeightRatio = calculations.volumeMm3 / remainingChamberVol;
     // 防止除以0
     if (remainingChamberVol <= 0.1) chamberLiquidHeightRatio = 1;
  }
  
  const chamberLiquidH = chamberH * Math.min(1, chamberLiquidHeightRatio);

  return (
    <div style={{ width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff7a45" />
            <stop offset="100%" stopColor="#ffec3d" />
          </linearGradient>
          <linearGradient id="chamberGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d9d9d9" />
            <stop offset="50%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#d9d9d9" />
          </linearGradient>
        </defs>
        
        {/* 坐标变换：原点设在左下角方便画图，还是用 translate */}
        {/* 整体下移，给上方型腔留空间 */}
        <g transform={`translate(50, ${height - 100})`}> 
        
          {/* --- 压室 Chamber (水平) --- */}
          <rect x={0} y={-10} width={chamberW} height={chamberH + 20} fill="#8c8c8c" rx={4} />
          <rect x={0} y={0} width={chamberW} height={chamberH} fill="url(#chamberGradient)" />
          
          {/* 切换点标记 */}
          <line x1={chamberW - (params.switchPoint * scale)} y1={chamberH} x2={chamberW - (params.switchPoint * scale)} y2={chamberH + 20} stroke="red" strokeWidth={2} strokeDasharray="4 2" />
          <text x={chamberW - (params.switchPoint * scale)} y={chamberH + 35} fontSize="12" textAnchor="middle" fill="red">切换点</text>

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
              fill="url(#liquidGradient)" 
              opacity={0.9}
            />
          )}
          
          {/* --- 流道 Runner (垂直) --- */}
          {/* 位于压室右端上方 */}
          <g transform={`translate(${chamberW - runnerW}, ${-runnerH})`}>
             {/* 外壳 */}
             <rect x={0} y={0} width={runnerW} height={runnerH} fill="none" stroke="#8c8c8c" strokeWidth={4} />
             {/* 遮挡底部线条，使其看起来连通 */}
             <rect x={4} y={runnerH - 4} width={runnerW - 8} height={8} fill="url(#chamberGradient)" /> 
             
             {/* 流道液体 */}
             {runnerProgress > 0 && (
               <rect 
                 x={2} 
                 y={runnerH * (1 - runnerProgress)} 
                 width={runnerW - 4} 
                 height={runnerH * runnerProgress} 
                 fill="url(#liquidGradient)" 
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
                 fill="url(#liquidGradient)" 
                 opacity={0.9}
               />
             )}
             
             <text x={moldW/2} y={moldH/2} textAnchor="middle" fill="#999" fontSize="16">产品 + 渣包</text>
          </g>

        </g>
        
        {/* 文字标注 */}
        <text x={50} y={height - 20} fontSize="14" fill={themeToken.colorTextSecondary}>压室 (Chamber)</text>
        <text x={50 + chamberW - 80} y={height - 180} fontSize="14" fill={themeToken.colorTextSecondary}>流道</text>
        <text x={50 + chamberW - 100} y={height - 330} fontSize="14" fill={themeToken.colorTextSecondary}>模具 (Mold)</text>
        
      </svg>
    </div>
  );
};
