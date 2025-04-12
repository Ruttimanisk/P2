const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");

// med rotes herfra skal man gå ud fra at de allerede er på /employee/

router.get('/home', user_controller.home)

router.get('/schedule', userschedule_controller.schedule)

router.get('/profile', user_controller.profile)

router.get('/logout', user_controller.logout)