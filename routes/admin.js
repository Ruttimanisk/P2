const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");

router.get('/admin_home', user_controller.home)

router.get('/admin_edit_schedule', user_controller.admin_edit_schedule)

router.get('/admin_schedule', user_controller.schedule)

module.exports = router;
