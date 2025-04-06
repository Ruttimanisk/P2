const express = require('express');
const router = express.Router();

const login_controller = require('../controllers/login_controller');

router.get("/", login_controller.index)

module.exports = router;