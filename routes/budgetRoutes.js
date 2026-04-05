const express = require('express');
const budgetController = require('../controllers/budgetController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, budgetController.listBudgets);
router.post('/', authenticateToken, budgetController.createBudget);
router.put('/:id', authenticateToken, budgetController.updateBudget);
router.delete('/:id', authenticateToken, budgetController.deleteBudget);

module.exports = router;
