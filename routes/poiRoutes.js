const express = require('express');
const poiController = require('../controllers/poiController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, poiController.listPois);
router.post('/', authenticateToken, poiController.createPoi);
router.delete('/:id', authenticateToken, poiController.deletePoi);

module.exports = router;
