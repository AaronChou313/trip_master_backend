const mysql = require('mysql2/promise');
require('dotenv').config();

const primaryKeys = {
  users: 'id',
  pois: 'id',
  itineraries: 'id',
  itinerary_pois: 'id',
  budgets: 'id',
  memos: 'id'
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: process.env.DB_CHARSET || 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 10000,
  queueLimit: 0,
  enableKeepAlive: true
});

function normalizeSql(sql) {
  return sql
    .replace(/\$(\d+)/g, '?')
    .replace(/\bAS\s+"([^"]+)"/gi, 'AS `$1`');
}

function extractReturning(sql) {
  const match = /\bRETURNING\b/i.exec(sql);
  if (!match) {
    return { sql, returning: null };
  }

  const returningIndex = match.index;
  return {
    sql: sql.slice(0, returningIndex).trim(),
    returning: sql.slice(returningIndex + match[0].length).trim()
  };
}

function convertOnConflict(sql) {
  return sql.replace(
    /ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+UPDATE\s+SET\s+/gi,
    'ON DUPLICATE KEY UPDATE '
  );
}

function getParamsForClause(clause, params) {
  const indexes = [...clause.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]) - 1);
  return indexes.map((index) => params[index]);
}

function convertClause(clause) {
  return clause
    .replace(/\$(\d+)/g, '?')
    .replace(/\bAS\s+"([^"]+)"/gi, 'AS `$1`');
}

function buildWhereByPrimaryKey(table, record) {
  const primaryKey = primaryKeys[table];
  if (!primaryKey || record[primaryKey] === undefined) {
    return null;
  }

  return {
    whereSql: `WHERE \`${primaryKey}\` = ?`,
    whereParams: [record[primaryKey]]
  };
}

function parseInsertTarget(sql) {
  const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z_][\w]*)\s*\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  return {
    table: match[1],
    columns: match[2].split(',').map((column) => column.trim().replace(/[`"]/g, ''))
  };
}

function parseUpdateTarget(sql, params) {
  const match = sql.match(/UPDATE\s+([a-zA-Z_][\w]*)[\s\S]*?\bWHERE\b([\s\S]+)$/i);
  if (!match) {
    return null;
  }

  return {
    table: match[1],
    whereSql: `WHERE ${convertClause(match[2].trim())}`,
    whereParams: getParamsForClause(match[2], params)
  };
}

function parseDeleteTarget(sql, params) {
  const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z_][\w]*)[\s\S]*?\bWHERE\b([\s\S]+)$/i);
  if (!match) {
    return null;
  }

  return {
    table: match[1],
    whereSql: `WHERE ${convertClause(match[2].trim())}`,
    whereParams: getParamsForClause(match[2], params)
  };
}

async function selectReturning(connection, table, returning, whereSql, whereParams) {
  const selectSql = `SELECT ${returning} FROM \`${table}\` ${whereSql}`;
  const [rows] = await connection.execute(normalizeSql(selectSql), whereParams);
  return rows;
}

async function query(text, params = []) {
  const originalSql = text.trim();
  const { sql: sqlWithoutReturning, returning } = extractReturning(originalSql);
  const sqlWithUpsert = convertOnConflict(sqlWithoutReturning);
  const normalizedSql = normalizeSql(sqlWithUpsert);
  const connection = await pool.getConnection();

  try {
    if (returning) {
      if (/^INSERT\s+INTO/i.test(originalSql)) {
        const target = parseInsertTarget(sqlWithoutReturning);
        const [result] = await connection.execute(normalizedSql, params);

        if (!target) {
          return { rows: [], rowCount: result.affectedRows || 0 };
        }

        const record = {};
        target.columns.forEach((column, index) => {
          if (index < params.length) {
            record[column] = params[index];
          }
        });

        if (record[primaryKeys[target.table]] === undefined && result.insertId) {
          record[primaryKeys[target.table]] = result.insertId;
        }

        const whereConfig = buildWhereByPrimaryKey(target.table, record);
        const rows = whereConfig
          ? await selectReturning(connection, target.table, returning, whereConfig.whereSql, whereConfig.whereParams)
          : [];
        return { rows, rowCount: result.affectedRows || rows.length };
      }

      if (/^UPDATE\s+/i.test(originalSql)) {
        const target = parseUpdateTarget(sqlWithoutReturning, params);
        const [result] = await connection.execute(normalizedSql, params);
        const rows = target
          ? await selectReturning(connection, target.table, returning, target.whereSql, target.whereParams)
          : [];
        return { rows, rowCount: result.affectedRows || rows.length };
      }

      if (/^DELETE\s+FROM/i.test(originalSql)) {
        const target = parseDeleteTarget(sqlWithoutReturning, params);
        const rows = target
          ? await selectReturning(connection, target.table, returning, target.whereSql, target.whereParams)
          : [];
        const [result] = await connection.execute(normalizedSql, params);
        return { rows, rowCount: result.affectedRows || rows.length };
      }
    }

    const [rows] = await connection.execute(normalizedSql, params);
    return {
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0)
    };
  } finally {
    connection.release();
  }
}

async function testConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await query('SELECT NOW() AS now');
      console.log('数据库连接成功:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('数据库连接失败:', error.message);
      retries -= 1;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

setImmediate(() => {
  testConnection().catch((error) => {
    console.error('数据库连接检测失败:', error.message);
  });
});

module.exports = {
  query,
  pool,
  testConnection
};
