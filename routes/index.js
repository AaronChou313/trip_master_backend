const express = require('express');
const authRoutes = require('./authRoutes');
const poiRoutes = require('./poiRoutes');
const itineraryRoutes = require('./itineraryRoutes');
const budgetRoutes = require('./budgetRoutes');
const memoRoutes = require('./memoRoutes');
const amapRoutes = require('./amapRoutes');
const systemController = require('../controllers/systemController');

const router = express.Router();

router.get('/', systemController.root);
router.get('/health', systemController.health);
router.get('/api/docs', systemController.docs);
router.get('/api/openapi.json', systemController.openapi);
router.use('/api/auth', authRoutes);
router.use('/api/pois', poiRoutes);
router.use('/api/itineraries', itineraryRoutes);
router.use('/api/budgets', budgetRoutes);
router.use('/api/memos', memoRoutes);
router.use('/api/amap', amapRoutes);

module.exports = router;
