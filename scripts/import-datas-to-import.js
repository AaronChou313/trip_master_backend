const fs = require('fs');
const path = require('path');
const { query, pool } = require('../config/db');

const importDir = path.join(__dirname, '../datas_to_import');
const importOrder = ['users', 'pois', 'itineraries', 'budgets', 'memos', 'itinerary_pois'];
const integerColumnsByTable = {
  users: new Set(['id']),
  itinerary_pois: new Set(['id', 'sort_order'])
};
const sharedIntegerColumns = new Set(['user_id']);
const decimalColumns = new Set(['amount', 'actual_amount', 'budget', 'transport_budget']);
const dateColumns = new Set(['date']);
const datetimeColumns = new Set(['created_at', 'updated_at']);

function parseCsv(content) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(current);
      current = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function convertValue(tableName, column, value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (sharedIntegerColumns.has(column) || integerColumnsByTable[tableName]?.has(column)) {
    return Number(value);
  }

  if (decimalColumns.has(column)) {
    return Number(value);
  }

  if (dateColumns.has(column) || datetimeColumns.has(column)) {
    return value;
  }

  return value;
}

function buildUpsertClause(columns) {
  return columns
    .filter((column) => column !== 'id')
    .map((column) => `\`${column}\` = VALUES(\`${column}\`)`)
    .join(', ');
}

async function importTable(tableName) {
  const csvPath = path.join(importDir, `${tableName}.csv`);
  const content = fs.readFileSync(csvPath, 'utf8');
  const [header, ...records] = parseCsv(content);
  const columns = header.map((column) => column.trim());
  const placeholders = columns.map(() => '?').join(', ');
  const columnSql = columns.map((column) => `\`${column}\``).join(', ');
  const upsertSql = buildUpsertClause(columns);

  let importedCount = 0;
  for (const record of records) {
    if (record.length === 1 && record[0] === '') {
      continue;
    }

    const values = columns.map((column, index) => convertValue(tableName, column, record[index]));
    await query(
      `INSERT INTO ${tableName} (${columnSql})
       VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${upsertSql}`,
      values
    );
    importedCount += 1;
  }

  if (tableName === 'users' || tableName === 'itinerary_pois') {
    const idResult = await query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ${tableName}`);
    await query(`ALTER TABLE ${tableName} AUTO_INCREMENT = ${Number(idResult.rows[0].next_id)}`);
  }

  console.log(`${tableName}: imported ${importedCount} rows`);
}

async function verifyTableCounts() {
  for (const tableName of importOrder) {
    const result = await query(`SELECT COUNT(*) AS count FROM ${tableName}`);
    console.log(`${tableName}: ${result.rows[0].count}`);
  }
}

async function main() {
  try {
    for (const tableName of importOrder) {
      await importTable(tableName);
    }
    console.log('数据导入完成，开始校验');
    await verifyTableCounts();
  } catch (error) {
    console.error('数据导入失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
