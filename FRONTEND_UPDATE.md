后端API需求清单                                                                                                                                                                                                                                                         1. 预算数据模型新增字段                                                                                                                                                                                                                                               
  在budget数据模型中添加 actualAmount 字段：

  {
    id: string/number,
    name: string,
    description: string,
    amount: number,        // 预算金额
    actualAmount: number,  // 新增：实际消费（默认值为0或null）
    category: string,      // 'itinerary' | 'transport' | 'accommodation' | 'custom'
    sourceType?: string,   // 'itinerary' 等
    sourceId?: number,
    createdAt: string
  }

  2. 现有API接口变更

  以下接口需要支持 actualAmount 字段的读写：
  ┌──────────────────┬────────┬────────────────────────────────────┐
  │       接口       │  方法  │              变更说明              │
  ├──────────────────┼────────┼────────────────────────────────────┤
  │ /api/budgets     │ GET    │ 返回的数据需包含 actualAmount 字段 │
  ├──────────────────┼────────┼────────────────────────────────────┤
  │ /api/budgets     │ POST   │ 接收的数据支持 actualAmount 字段   │
  ├──────────────────┼────────┼────────────────────────────────────┤
  │ /api/budgets/:id │ PUT    │ 支持更新 actualAmount 字段         │
  ├──────────────────┼────────┼────────────────────────────────────┤
  │ /api/budgets/:id │ DELETE │ 无需变更                           │
  └──────────────────┴────────┴────────────────────────────────────┘
  3. 数据库迁移（如适用）

  如使用关系型数据库，需要添加列：

  ALTER TABLE budgets ADD COLUMN actual_amount DECIMAL(10,2) DEFAULT 0;

  如使用MongoDB：
  // 模型中添加字段
  const BudgetSchema = new Schema({
    // ... 其他字段
    actualAmount: { type: Number, default: 0 }
  });

  ---
  前端功能总结

  已添加的功能：
  1. 预算项显示 - 每个预算项同时显示预算和实际消费
  2. 类别小计 - 每个类别显示预算小计和实际消费小计
  3. 总计对比 - 右侧显示总预算、总实际消费和节省/超支金额
  4. 编辑功能 - 编辑弹窗中可输入实际消费金额
  5. 图表对比 - 柱状图显示预算 vs 实际消费的对比
  6. 超支标识 - 超过预算时红色高亮显示