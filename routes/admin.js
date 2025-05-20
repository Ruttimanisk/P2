const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const {body} = require("express-validator");
const Absence = require("../models/absence");
const { requireAuth } = require('../middleware/auth');
const mongoose = require('mongoose')
const { runpy } = require('../public/scripts/buttonRunPyAlgorithm.js');
const fs = require('fs');
const path = require('path');

// med rotes herfra skal man gå ud fra at de allerede er på /admin/
// tilføj requireAuth til alle når vi har fået login til at fungere
// skal se sådan her ud: router.get('/home', requireAuth, user_controller.home)
// router der står som kommentare er ting der ikke er lavet en controller funktion til endnu.

router.post('/run_algorithm', async (req, res) => {
    const arg = req.body?.param;
    runpy(String(arg));
    res.json({ message: 'Algorithm started with param: ' + arg });
});

// burde måske gøre det her i controller
router.get('/calendar', requireAuth, async (req, res) => {
    const db = mongoose.connection;
    const shifts = await db.collection('shifts').find().toArray();

    console.log("📄 Eksempel på shift:");
    console.log(shifts[0]);
    console.log("➡️ employee_id type:", typeof shifts[0]?.employee_id);


    const employeeIds = [...new Set(shifts.map(shift => shift.employee_id?.toString()))];
    const userObjectIds = employeeIds.map(id => new mongoose.Types.ObjectId(id));

    const users = await db.collection('users').find({ _id: { $in: userObjectIds } }).toArray();

    const events = shifts
        .filter(shift => shift.date && shift.start && shift.end && shift.employee_id)
        .map(shift => ({
            id: shift._id?.toString(),
            title: `${shift.start} - ${shift.end}`,
            start: `${shift.date}T${shift.start}`,
            end: `${shift.date}T${shift.end}`,
            resourceId: shift.employee_id.toString()
        }));

    const calculateShiftHours = (start, end) => {
        const startDate = new Date(`1970-01-01T${start}`);
        const endDate = new Date(`1970-01-01T${end}`);
        const diffMs = endDate - startDate;
        return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    };

    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);

    const resources = employeeIds.map(idStr => {
        const user = users.find(u => u._id.toString() === idStr);
        const userShifts = shifts.filter(s => s.employee_id?.toString() === idStr);

        let hoursTotal = 0;
        let hoursTwoWeeks = 0;

        for (const shift of userShifts) {
            const shiftHours = calculateShiftHours(shift.start, shift.end);
            hoursTotal += shiftHours;

            const shiftDate = new Date(shift.date);
            if (shiftDate >= twoWeeksAgo) {
                hoursTwoWeeks += shiftHours;
            }
        }

        const contractHours = user?.hours_per_week || 0;
        const expectedTwoWeeks = contractHours * 2;

        const createdAt = user?.createdAt ? new Date(user.createdAt) : new Date('2024-01-01');
        const weeksSince = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24 * 7)));

        const balanceTwoWeeks = hoursTwoWeeks - expectedTwoWeeks;
        const balanceTotal = hoursTotal - contractHours * weeksSince;

        return {
            id: idStr,
            title: user ? `${user.first_name} ${user.family_name}` : 'Ukendt',
            currentHours: hoursTwoWeeks.toFixed(1),
            expectedHours: expectedTwoWeeks.toFixed(1),
            saldoTwoWeeks: balanceTwoWeeks.toFixed(1),
            saldoTotal: balanceTotal.toFixed(1)
        };
    });

    console.log("Events:", events);
    console.log("Resources:", resources);

    res.render('admin_calendar', {
        events,
        resources
    });
});

router.post('/update_shift', async (req, res) => {
    const { id, start, end, resourceId, title } = req.body;
    const schedulePath = path.join(__dirname, '../schedules.json');
    const schedules = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

    // Find og opdatér eksisterende vagt
    for (const [user, shifts] of Object.entries(schedules)) {
        for (const day in shifts) {
            if (shifts[day].id === id) {
                shifts[day] = { id, start, end, title };
                break;
            }
        }
    }

    fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2));
    res.sendStatus(200);
});

router.post('/create_shift', async (req, res) => {
    const { start, end, resourceId, title } = req.body;
    const schedulePath = path.join(__dirname, '../schedules.json');
    const schedules = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

    const newId = Date.now().toString(); // simpelt ID baseret på timestamp

    if (!schedules[resourceId]) {
        schedules[resourceId] = {};
    }

    const dateKey = new Date(start).toLocaleDateString('en-CA'); // 2025-05-02 format

    schedules[resourceId][dateKey] = {
        id: newId,
        title,
        start,
        end
    };

    fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2));
    res.sendStatus(200);
});

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

/*
router.get('/edit_schedule', userschedule_controller.admin_edit_schedule)

router.get('/edit_employee_schedule/:username', requireAuth, (req, res) => {
        const username = req.params.username;

        const userPath = path.join(__dirname, "../user_info.json");
        const schedulePath = path.join(__dirname, "../schedules.json");

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
        const schedulePath = path.join(__dirname, "../schedules.json");

        const newSchedule = JSON.parse(req.body.schedule); // comes from the hidden input

        const schedules = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
        schedules[username] = newSchedule;

        fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2));
        res.redirect(`/edit_employee_schedule/${username}`);
});

router.get('/schedule', requireAuth, user_controller.show_admin_schedule)

router.get('/edit_employee_schedule/:username', requireAuth, (req, res) => {
        const username = req.params.username;

        const userPath = path.join(__dirname, "../user_info.json");
        const schedulePath = path.join(__dirname, "../schedules.json");

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
        const schedulePath = path.join(__dirname, "../schedules.json");

        const newSchedule = JSON.parse(req.body.schedule); // comes from the hidden input

        const schedules = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
        schedules[username] = newSchedule;

        fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2));
        res.redirect(`/edit_employee_schedule/${username}`);
});
*/

module.exports = router;
