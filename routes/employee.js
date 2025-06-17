const express = require("express");
const router = express.Router();
const user_controller = require("../controllers/user_controller");
const { requireAuth } = require("../middleware/auth");


router.get('/home', requireAuth, user_controller.employee_home);

router.get('/calendar', requireAuth, user_controller.employee_calendar);

router.get('/profile', requireAuth, user_controller.profile);

router.get('/logout', user_controller.logout);

module.exports = router;

