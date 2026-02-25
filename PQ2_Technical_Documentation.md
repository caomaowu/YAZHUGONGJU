
# 压铸PQ²平方图技术文档

## 目录
1. [PQ²图概述](#1-pq²图概述)
2. [基本原理](#2-基本原理)
3. [核心公式](#3-核心公式)
4. [参数说明](#4-参数说明)
5. [计算流程](#5-计算流程)
6. [程序复现](#6-程序复现)
7. [应用案例](#7-应用案例)

---

## 1. PQ²图概述

### 1.1 什么是PQ²图

PQ²图（Pressure-Quantity Squared Diagram）是压铸工艺中的核心技术工具，用于分析和优化压铸机、模具与铸件之间的能量匹配关系。

**核心概念：**
- **P** - 压射比压（金属静压力）
- **Q** - 金属液流量
- **Q²** - 流量的平方（横坐标）

### 1.2 PQ²图的作用

1. **验证模具设计**：在模具设计阶段预测压铸可行性
2. **优化工艺参数**：确定合理的填充时间、浇口速度
3. **设备选型**：匹配压铸机与模具的性能
4. **故障诊断**：分析铸件缺陷的原因

### 1.3 图形组成

PQ²图包含三条核心曲线：
- **机床线（Machine Line）**：描述压铸机的液压能力
- **模具线（Die Line）**：描述浇注系统的流动阻力
- **工艺窗口（Process Window）**：合理的工艺参数范围

---

## 2. 基本原理

### 2.1 能量守恒原理

PQ²图基于**伯努利方程**（Bernoulli's Equation），描述流体在管道中的能量守恒：

```
P₁ + ρgh₁ + ½ρv₁² = P₂ + ρgh₂ + ½ρv₂²
```

在压铸应用中简化为：
```
P = ρ × V² / 2
```

### 2.2 机床线原理

机床线描述压铸机的液压系统特性。根据能量守恒，压铸机提供的压力与流量满足：

```
P = Pm × (1 - (Q/Qmax)²)
```

**物理意义：**
- 当Q=0时，P=Pm（最大静压力）
- 当Q=Qmax时，P=0（最大流量时无压力）

### 2.3 模具线原理

模具线描述金属液通过浇注系统的阻力特性。根据伯努利方程：

```
P = ρ × V² / (2 × Cd²)
```

其中Cd为**流量系数**（Discharge Coefficient），反映能量损失：
- Cd = 1.0：无能量损失（理想状态）
- Cd = 0.8：设计良好的浇注系统
- Cd = 0.6：设计一般的浇注系统
- Cd = 0.4-0.5：设计较差的浇注系统

### 2.4 工艺窗口原理

工艺窗口定义了合理的压铸工艺参数范围：
- **上边界**：最大浇口速度（防止湍流、气孔）
- **下边界**：最小浇口速度（防止冷隔、填充不足）
- **左边界**：最小流量（基于最大填充时间）
- **右边界**：最大压射比压（基于锁模力）

---

## 3. 核心公式

### 3.1 单位系统

**CGS单位制（推荐）：**
| 参数 | 符号 | 单位 | 说明 |
|------|------|------|------|
| 密度 | ρ | g/cm³ | 液态金属密度 |
| 速度 | V | cm/s | 1 m/s = 100 cm/s |
| 面积 | A | cm² | 冲头/浇口面积 |
| 流量 | Q | cm³/s | 体积流量 |
| 压力 | P | kg/cm² | 1 kg/cm² ≈ 0.098 MPa |
| 重力加速度 | g | 981 cm/s² | 标准值 |

### 3.2 机床线公式

#### 3.2.1 最大金属静压力

```
Pm = Phyd × (dhyd / dpt)²
```

**参数：**
- Phyd：储能器压力（kg/cm²）
- dhyd：压射缸直径（cm）
- dpt：冲头直径（cm）

**物理意义：** 压射缸的液压压力通过面积比放大到冲头处的金属液压力。

#### 3.2.2 最大流量

```
Qmax = Vds × 100 × A_plunger

其中: A_plunger = π × (dpt/2)²
```

**参数：**
- Vds：最大空压射速度（m/s）
- dpt：冲头直径（cm）
- A_plunger：冲头截面积（cm²）

**物理意义：** 压铸机在空载状态下的最大金属液流量。

#### 3.2.3 机床线方程

```
P = Pm × (1 - (Q/Qmax)²)
```

或表示为直线方程：
```
P = Pm - (Pm/Qmax²) × Q²
```

**在PQ²图中的表示：**
- 横坐标：Q²（单位：(dm³/s)²）
- 纵坐标：P（单位：kg/cm²）
- 截距：Pm
- 斜率：-Pm/Qmax²

### 3.3 模具线公式

#### 3.3.1 基本方程

```
P = ρ × Q² / (2 × Cd² × Ag² × g × 1000)
```

或表示为：
```
P = K × Q²

其中: K = ρ / (2 × Cd² × Ag² × g × 1000)
```

**参数：**
- ρ：液态金属密度（g/cm³）
- Cd：流量系数（无量纲）
- Ag：浇口面积（cm²）
- g：重力加速度（981 cm/s²）

#### 3.3.2 浇口速度计算

```
Vg = Q / (Cd × Ag)
```

**物理意义：** 金属液通过内浇口的速度。

### 3.4 工艺窗口公式

#### 3.4.1 最大/最小压射比压

```
Pmax = ρ × (Vmax × 100)² / (2 × Cd² × g × 1000)
Pmin = ρ × (Vmin × 100)² / (2 × Cd² × g × 1000)
```

**参数：**
- Vmax：允许的最大浇口速度（m/s）
- Vmin：允许的最小浇口速度（m/s）

#### 3.4.2 最小流量（基于填充时间）

```
Qmin = Vcav / t
```

**参数：**
- Vcav：型腔体积（含渣包）（cm³）
- t：最大填充时间（s）

#### 3.4.3 填充时间估算

```
t = k × H
```

**参数：**
- k：经验常数（s/mm）
- H：铸件壁厚（mm）

### 3.5 工作点计算

#### 3.5.1 预估流量

```
Qact = Vg × 100 × Ag
```

**参数：**
- Vg：预估浇口速度（m/s）
- Ag：浇口面积（cm²）

#### 3.5.2 预估压射比压

```
Pact = ρ × Qact² / (2 × Cd² × Ag² × g × 1000)
```

#### 3.5.3 设定二快速度

```
V_second = Qact / A_plunger / 100
```

**物理意义：** 压射冲头的实际运动速度。

---

## 4. 参数说明

### 4.1 材料参数

| 参数 | 符号 | 典型值 | 说明 |
|------|------|--------|------|
| 液态金属密度 | ρ | 2.5 g/cm³ | 铝合金360/380/384 |
| 液相线温度 | Ti | 650°C | 金属完全液态 |
| 固相线温度 | Tf | 570°C | 金属开始凝固 |
| 模具温度 | Td | 250°C | 推荐模具工作温度 |

### 4.2 机床参数

| 参数 | 符号 | 单位 | 说明 |
|------|------|------|------|
| 储能器压力 | Phyd | kg/cm² | 液压系统压力 |
| 压射缸直径 | dhyd | cm | 液压缸内径 |
| 冲头直径 | dpt | cm | 压射冲头直径 |
| 最大空压射速度 | Vds | m/s | 无负载时的最大速度 |

### 4.3 模具参数

| 参数 | 符号 | 单位 | 说明 |
|------|------|------|------|
| 浇口面积 | Ag | cm² | 内浇口截面积 |
| 浇口速度 | Vg | m/s | 金属液通过浇口的速度 |
| 流量系数 | Cd | - | 能量损失系数 |

### 4.4 工艺参数

| 参数 | 符号 | 单位 | 推荐范围 |
|------|------|------|----------|
| 填充时间 | t | s | 0.05-0.2 |
| 浇口速度 | Vg | m/s | 30-60 |
| 压射比压 | P | kg/cm² | 50-200 |

---

## 5. 计算流程

### 5.1 步骤1：计算机床线

1. 计算最大金属静压力：`Pm = Phyd × (dhyd/dpt)²`
2. 计算冲头面积：`A_plunger = π × (dpt/2)²`
3. 计算最大流量：`Qmax = Vds × 100 × A_plunger`
4. 建立机床线方程：`P = Pm × (1 - (Q/Qmax)²)`

### 5.2 步骤2：计算模具线

1. 计算模具线常数：`K = ρ / (2 × Cd² × Ag² × g × 1000)`
2. 建立模具线方程：`P = K × Q²`

### 5.3 步骤3：确定工艺窗口

1. 计算最大压射比压：`Pmax = ρ × (Vmax×100)² / (2×Cd²×g×1000)`
2. 计算最小压射比压：`Pmin = ρ × (Vmin×100)² / (2×Cd²×g×1000)`
3. 计算最小流量：`Qmin = Vcav / t`

### 5.4 步骤4：计算机床线与模具线交点

求解方程组：
```
P = Pm × (1 - (Q/Qmax)²)  [机床线]
P = K × Q²                 [模具线]
```

得：
```
K × Q² = Pm × (1 - (Q/Qmax)²)
```

解此方程可得实际工作点的Q和P值。

### 5.5 步骤5：验证工作点

检查工作点是否在工艺窗口内：
- Pmin ≤ P ≤ Pmax
- Qmin ≤ Q ≤ Qmax（基于浇口速度）

---

## 6. 程序复现

### 6.1 Python实现

```python
import math
import matplotlib.pyplot as plt
import numpy as np

class PQ2Diagram:
    def __init__(self):
        # 材料参数
        self.rho = 2.5          # 液态金属密度 (g/cm³)
        self.g = 981.0          # 重力加速度 (cm/s²)

    def calculate_machine_line(self, Phyd, dhyd, dpt, Vds):
        """
        计算机床线参数

        参数:
            Phyd: 储能器压力 (kg/cm²)
            dhyd: 压射缸直径 (cm)
            dpt: 冲头直径 (cm)
            Vds: 最大空压射速度 (m/s)

        返回:
            Pm: 最大金属静压力 (kg/cm²)
            Qmax: 最大流量 (cm³/s)
        """
        # 最大金属静压力
        Pm = Phyd * (dhyd / dpt) ** 2

        # 冲头面积
        A_plunger = math.pi * (dpt / 2) ** 2

        # 最大流量
        Qmax = Vds * 100 * A_plunger

        return Pm, Qmax

    def calculate_die_line(self, Ag, Cd):
        """
        计算模具线常数

        参数:
            Ag: 浇口面积 (cm²)
            Cd: 流量系数

        返回:
            K: 模具线常数
        """
        K = self.rho / (2 * Cd**2 * Ag**2 * self.g * 1000)
        return K

    def calculate_process_window(self, Vmax, Vmin, Vcav, t, Cd, Ag):
        """
        计算工艺窗口边界

        参数:
            Vmax: 最大浇口速度 (m/s)
            Vmin: 最小浇口速度 (m/s)
            Vcav: 型腔体积 (cm³)
            t: 最大填充时间 (s)
            Cd: 流量系数
            Ag: 浇口面积 (cm²)

        返回:
            Pmax, Pmin, Qmin
        """
        # 最大/最小压射比压
        Pmax = self.rho * (Vmax * 100)**2 / (2 * Cd**2 * self.g * 1000)
        Pmin = self.rho * (Vmin * 100)**2 / (2 * Cd**2 * self.g * 1000)

        # 最小流量
        Qmin = Vcav / t

        return Pmax, Pmin, Qmin

    def calculate_operating_point(self, Vg, Ag, Pm, Qmax, Cd):
        """
        计算实际工作点

        参数:
            Vg: 预估浇口速度 (m/s)
            Ag: 浇口面积 (cm²)
            Pm: 最大金属静压力 (kg/cm²)
            Qmax: 最大流量 (cm³/s)
            Cd: 流量系数

        返回:
            Qact: 实际流量 (cm³/s)
            Pact: 实际压射比压 (kg/cm²)
        """
        # 实际流量
        Qact = Vg * 100 * Ag

        # 实际压射比压
        Pact = self.rho * Qact**2 / (2 * Cd**2 * Ag**2 * self.g * 1000)

        return Qact, Pact

    def plot_pq2_diagram(self, Phyd, dhyd, dpt, Vds, Ag, Cd, 
                         Vmax, Vmin, Vcav, t, Vg):
        """
        绘制PQ²图
        """
        # 计算机床线
        Pm, Qmax = self.calculate_machine_line(Phyd, dhyd, dpt, Vds)

        # 计算模具线常数
        K = self.calculate_die_line(Ag, Cd)

        # 计算工艺窗口
        Pmax, Pmin, Qmin = self.calculate_process_window(Vmax, Vmin, Vcav, t, Cd, Ag)

        # 计算工作点
        Qact, Pact = self.calculate_operating_point(Vg, Ag, Pm, Qmax, Cd)

        # 生成Q²值范围 (转换为 dm³/s)
        Q_squared = np.linspace(0, (Qmax/1000)**2, 500)

        # 计算机床线P值
        Q = np.sqrt(Q_squared) * 1000  # 转换回 cm³/s
        P_machine = Pm * (1 - (Q/Qmax)**2)

        # 计算模具线P值
        P_die = K * (Q**2)

        # 创建图形
        fig, ax = plt.subplots(figsize=(12, 8))

        # 绘制机床线
        ax.plot(Q_squared, P_machine, 'r-', linewidth=2, label='Machine Line')

        # 绘制模具线
        ax.plot(Q_squared, P_die, 'b-', linewidth=2, label='Die Line')

        # 绘制工艺窗口
        ax.axhline(y=Pmax, color='g', linestyle='--', alpha=0.5, label='Pmax')
        ax.axhline(y=Pmin, color='g', linestyle='--', alpha=0.5, label='Pmin')
        ax.axvline(x=(Qmin/1000)**2, color='g', linestyle='--', alpha=0.5, label='Qmin')

        # 绘制工作点
        ax.plot((Qact/1000)**2, Pact, 'ro', markersize=10, label='Operating Point')

        # 设置标签
        ax.set_xlabel('Q² (dm³/s)²', fontsize=12)
        ax.set_ylabel('P (kg/cm²)', fontsize=12)
        ax.set_title('PQ² Diagram', fontsize=14)
        ax.legend()
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.show()

        return {
            'Pm': Pm,
            'Qmax': Qmax,
            'K': K,
            'Pmax': Pmax,
            'Pmin': Pmin,
            'Qmin': Qmin,
            'Qact': Qact,
            'Pact': Pact
        }

# 使用示例
pq2 = PQ2Diagram()

# 输入参数
params = {
    'Phyd': 160.0,      # 储能器压力 (kg/cm²)
    'dhyd': 21.0,       # 压射缸直径 (cm)
    'dpt': 13.0,        # 冲头直径 (cm)
    'Vds': 6.08,        # 最大空压射速度 (m/s)
    'Ag': 15.108696,    # 浇口面积 (cm²)
    'Cd': 0.5,          # 流量系数
    'Vmax': 60.0,       # 最大浇口速度 (m/s)
    'Vmin': 30.0,       # 最小浇口速度 (m/s)
    'Vcav': 5560.0,     # 型腔体积 (cm³)
    't': 0.101205,      # 最大填充时间 (s)
    'Vg': 46.0          # 预估浇口速度 (m/s)
}

# 计算并绘图
results = pq2.plot_pq2_diagram(**params)

# 输出结果
print("计算结果:")
for key, value in results.items():
    print(f"{key}: {value:.6f}")
```

### 6.2 JavaScript实现

```javascript
class PQ2Calculator {
    constructor() {
        this.rho = 2.5;     // 液态金属密度 (g/cm³)
        this.g = 981.0;     // 重力加速度 (cm/s²)
    }

    /**
     * 计算机床线参数
     */
    calculateMachineLine(Phyd, dhyd, dpt, Vds) {
        // 最大金属静压力
        const Pm = Phyd * Math.pow(dhyd / dpt, 2);

        // 冲头面积
        const APlunger = Math.PI * Math.pow(dpt / 2, 2);

        // 最大流量
        const Qmax = Vds * 100 * APlunger;

        return { Pm, Qmax, APlunger };
    }

    /**
     * 计算模具线常数
     */
    calculateDieLine(Ag, Cd) {
        const K = this.rho / (2 * Math.pow(Cd, 2) * Math.pow(Ag, 2) * this.g * 1000);
        return K;
    }

    /**
     * 计算工艺窗口边界
     */
    calculateProcessWindow(Vmax, Vmin, Vcav, t, Cd, Ag) {
        // 最大/最小压射比压
        const Pmax = this.rho * Math.pow(Vmax * 100, 2) / 
                     (2 * Math.pow(Cd, 2) * this.g * 1000);
        const Pmin = this.rho * Math.pow(Vmin * 100, 2) / 
                     (2 * Math.pow(Cd, 2) * this.g * 1000);

        // 最小流量
        const Qmin = Vcav / t;

        return { Pmax, Pmin, Qmin };
    }

    /**
     * 计算实际工作点
     */
    calculateOperatingPoint(Vg, Ag, Cd) {
        // 实际流量
        const Qact = Vg * 100 * Ag;

        // 实际压射比压
        const Pact = this.rho * Math.pow(Qact, 2) / 
                     (2 * Math.pow(Cd, 2) * Math.pow(Ag, 2) * this.g * 1000);

        return { Qact, Pact };
    }

    /**
     * 计算机床线P值
     */
    calculateMachinePressure(Q, Pm, Qmax) {
        return Pm * (1 - Math.pow(Q / Qmax, 2));
    }

    /**
     * 计算模具线P值
     */
    calculateDiePressure(Q, K) {
        return K * Math.pow(Q, 2);
    }
}

// 使用示例
const calculator = new PQ2Calculator();

const params = {
    Phyd: 160.0,
    dhyd: 21.0,
    dpt: 13.0,
    Vds: 6.08,
    Ag: 15.108696,
    Cd: 0.5,
    Vmax: 60.0,
    Vmin: 30.0,
    Vcav: 5560.0,
    t: 0.101205,
    Vg: 46.0
};

// 计算机床线
const { Pm, Qmax, APlunger } = calculator.calculateMachineLine(
    params.Phyd, params.dhyd, params.dpt, params.Vds
);

// 计算模具线
const K = calculator.calculateDieLine(params.Ag, params.Cd);

// 计算工艺窗口
const { Pmax, Pmin, Qmin } = calculator.calculateProcessWindow(
    params.Vmax, params.Vmin, params.Vcav, params.t, params.Cd, params.Ag
);

// 计算工作点
const { Qact, Pact } = calculator.calculateOperatingPoint(
    params.Vg, params.Ag, params.Cd
);

console.log('计算结果:', { Pm, Qmax, K, Pmax, Pmin, Qmin, Qact, Pact });
```

---

## 7. 应用案例

### 7.1 案例背景

**产品信息：**
- 材质：铝合金360/380/384
- 产品+渣包质量：13900 g
- 产品体积（含渣包）：5560 cm³
- 壁厚：6 mm

**机床信息：**
- 储能器压力：160 kg/cm²
- 压射缸直径：21 cm
- 冲头直径：13 cm
- 最大空压射速度：6.08 m/s

**模具信息：**
- 浇口面积：15.108696 cm²
- 流量系数：0.5

**工艺要求：**
- 最大浇口速度：60 m/s
- 最小浇口速度：30 m/s
- 预估浇口速度：46 m/s

### 7.2 计算结果

| 参数 | 计算值 | 单位 |
|------|--------|------|
| 最大金属静压力 (Pm) | 417.514793 | kg/cm² |
| 最大流量 (Qmax) | 80701.23 | cm³/s |
| 最大压射比压 (Pmax) | 183.486239 | kg/cm² |
| 最小压射比压 (Pmin) | 45.871560 | kg/cm² |
| 最小流量 (Qmin) | 54938.00 | cm³/s |
| 预估流量 (Qact) | 69500.00 | cm³/s |
| 预估压射比压 (Pact) | 107.849134 | kg/cm² |
| 设定二快速度 | 5.238759 | m/s |

### 7.3 结果分析

1. **工作点位置**：(Q²=4830.25, P=107.85)
2. **工艺窗口验证**：
   - Pmin (45.87) < Pact (107.85) < Pmax (183.49) ✓
   - Qmin (54.94) < Qact (69.50) < Qmax (80.70) ✓
3. **结论**：工作点位于工艺窗口内，工艺参数合理。

---

## 附录

### A. 常用铝合金参数

| 合金 | 密度 (g/cm³) | 液相线温度 (°C) | 固相线温度 (°C) |
|------|--------------|-----------------|-----------------|
| A360 | 2.68 | 616 | 557 |
| A380 | 2.71 | 595 | 538 |
| A384 | 2.70 | 596 | 521 |
| ADC12 | 2.70 | 595 | 540 |

### B. 流量系数参考

| 浇注系统设计 | Cd值 |
|--------------|------|
| 优秀 | 0.7-0.8 |
| 良好 | 0.6-0.7 |
| 一般 | 0.5-0.6 |
| 较差 | 0.4-0.5 |

### C. 浇口速度推荐

| 铸件类型 | 浇口速度 (m/s) |
|----------|----------------|
| 薄壁件 | 50-70 |
| 一般件 | 40-55 |
| 厚壁件 | 30-45 |

---

**文档版本**: 1.0  
**最后更新**: 2025年
