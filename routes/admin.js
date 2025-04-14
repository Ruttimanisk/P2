const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");
const {body} = require("express-validator");

// med rotes herfra skal man gå ud fra at de allerede er på /admin/

router.get('/home', user_controller.home)

router.get('/schedule', userschedule_controller.schedule)

router.get('/profile', user_controller.profile)

router.get('/logout', user_controller.logout)

router.get('/edit_schedule', userschedule_controller.admin_edit_schedule)

router.get('/employee_list', user_controller.admin_employee_list)

router.get('/user_creation', (req, res) => { res.render('admin_user_creation') })

router.post(
    '/user_creation',
    [
        body("first_name", "First name must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("family_name", "Family name must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("date_of_birth", "Date of birth must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("date_of_death").escape(),
        body("address").escape(),
        body("hours_per_week", "hours per week must not be empty.")
            .trim()
            .isNumeric()
            .escape(),
        body("hourly_rate", "hourly rate must not be empty.")
            .trim()
            .isNumeric()
            .escape(),
        body("role", "Role must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("status", "Status must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("contract").escape(),
        body('username')
            .trim()
            .notEmpty().withMessage('Username is required')
            .isLength({ max: 50 }).withMessage('Username too long'),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ max: 50 }).withMessage('Password too long'),
    ],
    user_controller.admin_user_creation
);



module.exports = router;
