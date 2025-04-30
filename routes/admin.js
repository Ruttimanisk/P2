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

        // Byg events
        const events = shifts
            .filter(shift => shift.date && shift.start && shift.end && shift.employee)
            .map(shift => ({
                    title: `${shift.start} - ${shift.end}`, // valgfrit
                    start: `${shift.date}T${shift.start}`,
                    end: `${shift.date}T${shift.end}`,
                    resourceId: shift.employee
            }));

        // Unikke medarbejdere som resources
        const resources = [...new Set(shifts.map(shift => shift.employee))]
            .map(name => ({ id: name, title: name }));

        // Debug
        console.log("📅 Events:", events);
        console.log("🧑‍🤝‍🧑 Resources:", resources);

        // RENDER - vigtigt: send IKKE JSON.stringify her
        res.render('admin_calendar', {
                events,
                resources
        });
});





        router.get('/home', requireAuth, user_controller.admin_home)

router.get('/schedule', requireAuth, user_controller.show_admin_schedule)

router.get('/prof_old', requireAuth, user_controller.profile)

// recreated profile
router.get('/profile/', requireAuth, user_controller.profile);

router.get('/view_profile/:userId', requireAuth, user_controller.view_profile)

router.get('/logout', user_controller.logout)

// router.get('/edit_schedule', userschedule_controller.admin_edit_schedule)

router.get('/edit_schedule', requireAuth, user_controller.render_edit_employee_schedule);

router.post('/edit_schedule', requireAuth, user_controller.save_edited_schedule);


/*router.get('/edit_employee_schedule/:username', requireAuth, (req, res) => {
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

        res.render("edit_employee_schedule", {
                username: user.username,
                schedule: userSchedule
        });
});

router.post('/edit_employee_schedule/:username', (req, res) => {
        const username = req.params.username;
        const schedulePath = path.join(__dirname, "../schedule.json");

        const newSchedule = JSON.parse(req.body.schedule); // comes from the hidden input

        const schedules = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
        schedules[username] = newSchedule;

        fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2));
        res.redirect(`/edit_employee_schedule/${username}`);
});*/

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
            // .notEmpty().withMessage("Leave end must not be empty.")
            // .isISO8601().withMessage("Leave end must be a valid ISO 8601 date.")
            .toDate()
    ],
    user_controller.absence_post
);

module.exports = router;
