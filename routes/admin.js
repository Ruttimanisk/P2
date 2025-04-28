const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");
const {body} = require("express-validator");
const { requireAuth } = require('../middleware/auth');
const mongoose = require('mongoose')

// med rotes herfra skal man gå ud fra at de allerede er på /admin/
// tilføj requireAuth til alle når vi har fået login til at fungere
// skal se sådan her ud: router.get('/home', requireAuth, user_controller.home)
// router der står som kommentare er ting der ikke er lavet en controller funktion til endnu.

// burde måske gøre det her i controller
router.get('/calendar', requireAuth, async (req, res) => {
        const db = mongoose.connection;
        const collection = db.collection('Schedule');
        const shifts = await collection.find().toArray();

        console.log("📦 Shifts data from DB:", shifts);
        console.log("🔎 Eksempel shift:", shifts[0]);

        const events = shifts.map(shift => {
                const date = shift.date || "2025-04-28"; // fallback kun hvis noget går galt
                return {
                        title: shift.employee,
                        start: `${date}T${shift.start}`,
                        end: `${date}T${shift.end}`,
                };
        });

        console.log("📆 Events to send to calendar.pug:", events);

        res.render('calendar', { events: JSON.stringify(events) });
});

router.get('/home', requireAuth, user_controller.admin_home)

// router.get('/schedule', userschedule_controller.schedule)

router.get('/prof_old', requireAuth, user_controller.profile)

// recreated profile
router.get('/profile/', requireAuth, user_controller.profile);

router.get('/view_profile/:userId', requireAuth, user_controller.view_profile)

router.get('/logout', user_controller.logout)

// router.get('/edit_schedule', userschedule_controller.admin_edit_schedule)

router.get('/admin_edit_employee_schedule/:username', requireAuth, (req, res) => {
        const username = req.params.username;

        const userPath = path.join(__dirname, "../user_info.json");
        const schedulePath = path.join(__dirname, "../schedule.json");

        const users = JSON.parse(fs.readFileSync(userPath, "utf8"));
        const schedules = JSON.parse(fs.readFileSync(schedulePath, "utf8"));

        const user = users.find(u => u.username === username);
        const userSchedule = schedules[username] || {}; // fallback if no schedule exists

        if (!user) {
                return res.status(404).send("User not found");
        }

        res.render("admin_schedule", {
                username: user.username,
                schedule: userSchedule
        });
});

router.post('/admin_edit_employee_schedule/:username', (req, res) => {
        const username = req.params.username;
        const schedulePath = path.join(__dirname, "../schedule.json");

        const newSchedule = JSON.parse(req.body.schedule); // comes from the hidden input

        const schedules = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
        schedules[username] = newSchedule;

        fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2));
        res.redirect(`/admin_edit_employee_schedule/${username}`);
});

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
        body("date_of_birth", "Date of birth must not be empty.")
            .trim()
            .isLength({ min: 1 })
            .escape(),
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


module.exports = router;
