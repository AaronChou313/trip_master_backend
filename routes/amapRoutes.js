const express = require('express');
const amapController = require('../controllers/amapController');

const router = express.Router();

router.get('/place/text', amapController.searchPlace);

module.exports = router;
