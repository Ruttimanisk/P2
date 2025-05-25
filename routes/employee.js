const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/user");



router.get('/home', requireAuth, user_controller.employee_home);

router.get('/calendar', requireAuth, async (req, res) => {
    const db = mongoose.connection;
    const shifts = await db.collection('shifts').find().toArray();

    const events = shifts
        .filter(shift => shift.date && shift.start && shift.end && shift.employee)
        .map(shift => ({
            title: `${shift.start} - ${shift.end}`,
            start: `${shift.date}T${shift.start}`,
            end: `${shift.date}T${shift.end}`,
            resourceId: shift.employee.toString()
        }));

    const employeeIds = [...new Set(shifts.map(shift => shift.employee.toString()))];

    const users = await User.find({ _id: { $in: employeeIds } }).lean().sort({ first_name: 1 });

    const userMap = Object.fromEntries(users.map(user => [user._id.toString(), `${user.first_name} ${user.family_name}`]));

    const resources = employeeIds.map(id => ({
        id: id.toString(),
        title: userMap[id.toString()] || 'Unknown user'
    }));

    console.log(resources.title)
    console.log("Events:", events);
    console.log("Resources:", resources);


    res.render('employee_calendar', {
        events,
        resources
    });
});

router.get('/prof_old', requireAuth, (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.redirect('/login');
    }

    const usersPath = path.join(__dirname, '../user_info.json');

    try {
        const users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('profile', {
            name: user.first_name,
            status: user.status
        });
    } catch (err) {
        console.error("Fejl ved læsning af brugere:", err);
        res.status(500).send("Server fejl");
    }
});

router.get('/profile', requireAuth, user_controller.profile);

router.get('/logout', user_controller.logout);

// router.get('/schedule', requireAuth, user_controller.show_employee_schedule);

module.exports = router;

