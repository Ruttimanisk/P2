const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const {body} = require("express-validator");
const Absence = require("../models/absence");
const { requireAuth } = require('../middleware/auth');
const mongoose = require('mongoose')
const { runpy } = require('../public/scripts/buttonRunPyAlgorithm.js');

// The urls shown here are all under /admin/
// We generally follow this format: router.get('*url*', requireAuth, user_controller.*function*)

router.post('/run_algorithm', async (req, res) => {
    const arg = req.body?.param;
    runpy(String(arg));
    res.json({ message: 'Algorithm started, reload the page.' });
});

router.get('/calendar', requireAuth, user_controller.calendar);

router.get('/home', requireAuth, user_controller.admin_home)

router.get('/profile/', requireAuth, user_controller.profile);

router.get('/view_profile/:userId', requireAuth, user_controller.view_profile)

router.get('/update_profile/:userId', requireAuth, user_controller.update_profile_get)

router.post(
    '/update_profile/:userId',
    requireAuth,
    [
        body("first_name", "First name must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("family_name", "Family name must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("date_of_birth", "Invalid or missing date.")
            .notEmpty().withMessage("Leave end must not be empty.")
            .isISO8601().withMessage("Leave end must be a valid ISO 8601 date.")
            .toDate(),
        body("status").escape(),
        body("role", "Role must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("address").escape(),
        body("hourly_rate", "hourly rate must not be empty.")
            .trim()
            .isNumeric()
            .escape(),
        body("hours_per_week", "hours per week must not be empty.")
            .trim()
            .isNumeric()
            .escape(),
    ],
    user_controller.update_profile_post)

router.get('/logout', user_controller.logout)

router.get('/edit_schedule', requireAuth, user_controller.edit_schedule_get);

router.post('/edit_schedule', requireAuth, user_controller.edit_schedule_post);

router.get('/employee_list', requireAuth, user_controller.admin_employee_list)

router.get('/user_creation', requireAuth, (req, res) => { res.render('admin_user_creation') })

router.post('/user_creation',
    requireAuth,
    [
        body("first_name", "First name must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("family_name", "Family name must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
        body("date_of_birth", "Invalid or missing date.")
            .notEmpty().withMessage("Leave end must not be empty.")
            .isISO8601().withMessage("Leave end must be a valid ISO 8601 date.")
            .toDate(),
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
        body("contract").escape(),
        body("status").escape(),
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

router.get('/absence', requireAuth, user_controller.absence_get)

router.post('/absence',
    requireAuth,
    [
        body("user", "Invalid user ObjectId.")
            .custom(user => mongoose.Types.ObjectId.isValid(user)),
        body("reason", "Reason must not be empty.")
            .trim()
            .isLength({ min: 1 }),
        body("leave_start", "Invalid or missing date.")
            .notEmpty().withMessage("Leave start must not be empty.")
            .isISO8601().withMessage("Leave start must be a valid ISO 8601 date.")
            .toDate(),
        body("leave_end", "Invalid or missing date.")
            .optional({ checkFalsy: true })
            .isISO8601().toDate(),
    ],
    user_controller.absence_post
);

router.delete('/absence/:id', async (req, res) => {
  try {
    await Absence.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
