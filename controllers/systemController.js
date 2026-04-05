const openApiSpec = require('../docs/openapi.json');
const db = require('../config/db');

function root(req, res) {
  res.json({
    message: 'Welcome to TripMaster API',
    version: '2.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    openapi: '/api/openapi.json',
    endpoints: {
      auth: '/api/auth',
      pois: '/api/pois',
      itineraries: '/api/itineraries',
      budgets: '/api/budgets',
      memos: '/api/memos',
      amap: '/api/amap'
    }
  });
}

function docs(req, res) {
  res.json({
    message: 'TripMaster API documentation',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    openapi: `${req.protocol}://${req.get('host')}/api/openapi.json`,
    apifox: {
      importFormat: 'OpenAPI 3.0',
      importUrl: `${req.protocol}://${req.get('host')}/api/openapi.json`
    }
  });
}

function openapi(req, res) {
  res.json(openApiSpec);
}

async function health(req, res) {
  try {
    const dbTest = await db.query('SELECT NOW() AS current_time');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
      },
      dbTime: dbTest.rows[0].current_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
}

module.exports = {
  root,
  docs,
  openapi,
  health
};
