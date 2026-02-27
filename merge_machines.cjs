const fs = require('fs');
const path = require('path');

// 文件路径
const existingPath = 'c:\\Users\\gcb\\Desktop\\压铸程序\\server\\machine_models.json';
const newPath = 'c:\\Users\\gcb\\Desktop\\压铸程序\\压铸机信息2.jsom';

try {
  // 读取文件
  const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
  const newDataRaw = fs.readFileSync(newPath, 'utf8');
  // 压铸机信息2.jsom 可能是 JSON 格式，但后缀是 jsom。如果是标准 JSON 没问题。
  const newData = JSON.parse(newDataRaw);

  console.log(`Original count: ${existingData['压铸机型号'].length}`);

  // 新增字段列表
  const newFields = [
    '哥林柱内距_mm',
    '系统工作压力_MPa',
    '电机功率_KVA',
    '油箱容量_L',
    '机身外型尺寸_mm'
  ];

  // 1. 初始化旧数据的新字段
  existingData['压铸机型号'].forEach(model => {
    newFields.forEach(field => {
      if (!model.hasOwnProperty(field)) {
        model[field] = null;
      }
    });
  });

  // 2. 遍历新数据并合并
  newData['压铸机型号'].forEach(newModel => {
    const modelName = newModel['型号'];
    const existingIndex = existingData['压铸机型号'].findIndex(m => m['型号'] === modelName);
    
    // 映射新数据字段到标准 Schema
    const mappedModel = {
      "型号": newModel["型号"],
      "锁模力_KN": newModel["锁模力_KN"],
      "锁模行程_mm": newModel["锁模行程_mm"],
      "模具厚度_mm": newModel["模具厚度_mm"],
      "模板尺寸_mm": newModel["模板尺寸_mm"],
      // 映射：哥林柱内距 -> 容模尺寸 (如果是新数据特有的)
      "容模尺寸_mm": newModel["哥林柱内距_mm"], 
      "哥林柱内距_mm": newModel["哥林柱内距_mm"],
      
      "最大铸造面积_40MPa_cm2": newModel["最大铸造面积_cm2"],
      
      // 压射位置：数组转字符串
      "压射位置_mm": Array.isArray(newModel["压射位置_mm"]) ? newModel["压射位置_mm"].join(',') : newModel["压射位置_mm"],
      
      "冲头行程_mm": newModel["射料行程_mm"], // 映射
      "压室法兰直径_mm": newModel["压射室法兰直径_mm"], // 映射
      "法兰高度_mm": newModel["法兰凸出定板高度_mm"], // 映射
      "顶出力_KN": newModel["顶出力_KN"],
      "顶出行程_mm": newModel["顶出行程_mm"],
      
      // 新字段
      "系统工作压力_MPa": newModel["系统工作压力_MPa"],
      "电机功率_KVA": newModel["电机功率_KVA"],
      "油箱容量_L": newModel["油箱容量_L"],
      "机身外型尺寸_mm": newModel["机身外型尺寸_mm"],
      
      // 构建压射配置
      "压射配置": [{
        "冲头直径_mm": newModel["冲头直径_mm"],
        "压射力_KN": newModel["压射力_KN"],
        "射料行程_mm": newModel["射料行程_mm"],
        "容量_铝_Kg": newModel["射料量_铝_Kg"], // 映射
        "铸造压力_MPa": newModel["铸造压力_MPa"],
        "铸造面积_cm2": newModel["铸造面积_cm2"]
      }]
    };
    
    if (existingIndex !== -1) {
      // 更新现有记录
      console.log(`Updating ${modelName}`);
      const existingModel = existingData['压铸机型号'][existingIndex];
      existingData['压铸机型号'][existingIndex] = { ...existingModel, ...mappedModel };
    } else {
      // 新增记录
      console.log(`Adding new model ${modelName}`);
      // 确保容模尺寸有值 (如果映射没生效，比如有些旧数据可能没有哥林柱)
      if (!mappedModel["容模尺寸_mm"] && mappedModel["哥林柱内距_mm"]) {
          mappedModel["容模尺寸_mm"] = mappedModel["哥林柱内距_mm"];
      }
      existingData['压铸机型号'].push(mappedModel);
    }
  });

  // 3. 排序 (按锁模力)
  existingData['压铸机型号'].sort((a, b) => a["锁模力_KN"] - b["锁模力_KN"]);

  console.log(`New count: ${existingData['压铸机型号'].length}`);

  // 4. 写回文件
  fs.writeFileSync(existingPath, JSON.stringify(existingData, null, 2), 'utf8');
  console.log('Merge complete.');

} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
