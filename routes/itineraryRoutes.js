const express = require('express');
const itineraryController = require('../controllers/itineraryController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, itineraryController.listItineraries);
router.post('/', authenticateToken, itineraryController.createItinerary);
router.put('/:id', authenticateToken, itineraryController.updateItinerary);
router.delete('/:id', authenticateToken, itineraryController.deleteItinerary);

module.exports = router;
