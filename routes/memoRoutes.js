const express = require('express');
const memoController = require('../controllers/memoController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, memoController.listMemos);
router.post('/', authenticateToken, memoController.createMemo);
router.put('/:id', authenticateToken, memoController.updateMemo);
router.delete('/:id', authenticateToken, memoController.deleteMemo);

module.exports = router;
