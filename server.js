const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';

// 创建数据目录
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('dist'));

// 数据文件路径
const DATA_FILES = {
  pois: path.join(DATA_DIR, 'pois.json'),
  itineraries: path.join(DATA_DIR, 'itineraries.json'),
  budgets: path.join(DATA_DIR, 'budgets.json'),
  memos: path.join(DATA_DIR, 'memos.json') // 添加备忘录数据文件
};

// 初始化数据文件
function initializeDataFiles() {
  const initData = {
    pois: [],
    itineraries: [],
    budgets: [],
    memos: [] // 初始化备忘录数组
  };

  Object.keys(DATA_FILES).forEach(key => {
    if (!fs.existsSync(DATA_FILES[key])) {
      fs.writeFileSync(DATA_FILES[key], JSON.stringify(initData[key], null, 2));
    }
  });
}

initializeDataFiles();

// 通用数据读取函数
function readData(fileName) {
  try {
    const data = fs.readFileSync(DATA_FILES[fileName], 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
}

// 通用数据写入函数
function writeData(fileName, data) {
  try {
    fs.writeFileSync(DATA_FILES[fileName], JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    return false;
  }
}

// 兴趣点相关API
app.get('/api/pois', (req, res) => {
  const pois = readData('pois');
  res.json(pois);
});

app.post('/api/pois', (req, res) => {
  const pois = readData('pois');
  const newPoi = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  pois.push(newPoi);
  if (writeData('pois', pois)) {
    res.status(201).json(newPoi);
  } else {
    res.status(500).json({ error: 'Failed to save POI' });
  }
});

app.delete('/api/pois/:id', (req, res) => {
  const pois = readData('pois');
  const filteredPois = pois.filter(poi => poi.id !== req.params.id);
  if (writeData('pois', filteredPois)) {
    res.json({ message: 'POI deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete POI' });
  }
});

// 行程相关API
app.get('/api/itineraries', (req, res) => {
  const itineraries = readData('itineraries');
  res.json(itineraries);
});

app.post('/api/itineraries', (req, res) => {
  const itineraries = readData('itineraries');
  console.log('=== 服务器接收新行程保存请求 ===');
  console.log('请求体:', req.body);
  console.log('保存前行程数量:', itineraries.length);
  console.log('保存前行程IDs:', itineraries.map(itin => itin.id));
  
  const newItinerary = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  console.log('创建的新行程ID:', newItinerary.id);
  itineraries.push(newItinerary);
  console.log('保存后行程数量:', itineraries.length);
  console.log('保存后行程IDs:', itineraries.map(itin => itin.id));
  
  if (writeData('itineraries', itineraries)) {
    console.log('数据写入成功，返回新行程:', newItinerary);
    res.status(201).json(newItinerary);
  } else {
    console.log('数据写入失败');
    res.status(500).json({ error: 'Failed to save itinerary' });
  }
});

app.put('/api/itineraries/:id', (req, res) => {
  const itineraries = readData('itineraries');
  console.log('=== 行程更新调试信息 ===');
  console.log('接收到的行程ID:', req.params.id, '类型:', typeof req.params.id);
  console.log('接收到的完整参数:', req.params);
  console.log('请求体中的ID:', req.body.id, '类型:', typeof req.body.id);
  console.log('存储的行程数量:', itineraries.length);
  console.log('存储的行程IDs详情:');
  itineraries.forEach((itin, index) => {
    console.log(`  [${index}] ID: "${itin.id}" (类型: ${typeof itin.id})`);
  });
  
  // 使用更健壮的ID比较方式
  let foundIndex = -1;
  const index = itineraries.findIndex((itin, idx) => {
    const idMatch = String(itin.id) === String(req.params.id);
    console.log(`比较索引 ${idx}: "${itin.id}" === "${req.params.id}" ? ${idMatch}`);
    if (idMatch) {
      foundIndex = idx;
    }
    return idMatch;
  });
  
  console.log('找到的索引:', foundIndex);
  
  if (foundIndex !== -1) {
    itineraries[foundIndex] = { ...itineraries[foundIndex], ...req.body, updatedAt: new Date().toISOString() };
    if (writeData('itineraries', itineraries)) {
      res.json(itineraries[foundIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update itinerary' });
    }
  } else {
    console.log('未找到匹配的行程，返回404');
    res.status(404).json({ error: 'Itinerary not found' });
  }
});

app.delete('/api/itineraries/:id', (req, res) => {
  const itineraries = readData('itineraries');
  const filteredItineraries = itineraries.filter(itin => itin.id !== req.params.id);
  if (writeData('itineraries', filteredItineraries)) {
    res.json({ message: 'Itinerary deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete itinerary' });
  }
});

// 预算相关API
app.get('/api/budgets', (req, res) => {
  const budgets = readData('budgets');
  res.json(budgets);
});

app.post('/api/budgets', (req, res) => {
  const budgets = readData('budgets');
  const newBudget = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  budgets.push(newBudget);
  if (writeData('budgets', budgets)) {
    res.status(201).json(newBudget);
  } else {
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

app.put('/api/budgets/:id', (req, res) => {
  const budgets = readData('budgets');
  const index = budgets.findIndex(budget => budget.id === req.params.id);
  if (index !== -1) {
    budgets[index] = { ...budgets[index], ...req.body, updatedAt: new Date().toISOString() };
    if (writeData('budgets', budgets)) {
      res.json(budgets[index]);
    } else {
      res.status(500).json({ error: 'Failed to update budget' });
    }
  } else {
    res.status(404).json({ error: 'Budget not found' });
  }
});

app.delete('/api/budgets/:id', (req, res) => {
  const budgets = readData('budgets');
  const filteredBudgets = budgets.filter(budget => budget.id !== req.params.id);
  if (writeData('budgets', filteredBudgets)) {
    res.json({ message: 'Budget deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// 备忘录相关API
app.get('/api/memos', (req, res) => {
  const memos = readData('memos');
  res.json(memos);
});

app.post('/api/memos', (req, res) => {
  const memos = readData('memos');
  const newMemo = {
    id: Date.now().toString(),
    title: req.body.title || '新备忘录',
    content: req.body.content || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memos.push(newMemo);
  if (writeData('memos', memos)) {
    res.status(201).json(newMemo);
  } else {
    res.status(500).json({ error: 'Failed to save memo' });
  }
});

app.put('/api/memos/:id', (req, res) => {
  const memos = readData('memos');
  const index = memos.findIndex(memo => memo.id === req.params.id);
  if (index !== -1) {
    memos[index] = { 
      ...memos[index], 
      ...req.body, 
      updatedAt: new Date().toISOString() 
    };
    if (writeData('memos', memos)) {
      res.json(memos[index]);
    } else {
      res.status(500).json({ error: 'Failed to update memo' });
    }
  } else {
    res.status(404).json({ error: 'Memo not found' });
  }
});

app.delete('/api/memos/:id', (req, res) => {
  const memos = readData('memos');
  const filteredMemos = memos.filter(memo => memo.id !== req.params.id);
  if (writeData('memos', filteredMemos)) {
    res.json({ message: 'Memo deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete memo' });
  }
});

// 导出所有数据
app.get('/api/export', (req, res) => {
  try {
    const exportData = {};
    Object.keys(DATA_FILES).forEach(key => {
      exportData[key] = readData(key);
    });
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// 导入数据
app.post('/api/import', (req, res) => {
  try {
    const importData = req.body;
    let success = true;
    
    Object.keys(importData).forEach(key => {
      if (DATA_FILES[key]) {
        if (!writeData(key, importData[key])) {
          success = false;
        }
      }
    });
    
    if (success) {
      res.json({ message: 'Data imported successfully' });
    } else {
      res.status(500).json({ error: 'Failed to import some data' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// 高德地图API代理
app.get('/api/amap/place/text', async (req, res) => {
  try {
    const { keywords, city } = req.query;
    const apiKey = process.env.AMAP_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'AMAP API key not configured' });
    }
    
    const url = `${process.env.AMAP_API_URL}/place/text?key=${apiKey}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&offset=20&page=1&extensions=all`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('AMAP API Error:', error);
    res.status(500).json({ error: 'Failed to fetch from AMAP API' });
  }
});

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`TripMaster Server running on http://${process.env.HOST}:${PORT}`);
});