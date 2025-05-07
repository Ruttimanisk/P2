const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");
const { requireAuth } = require("../middleware/auth");



router.get('/home', requireAuth, user_controller.employee_home);

router.get('/schedule', requireAuth, user_controller.show_employee_schedule);

// Kalender med FullCalendar visning
router.get('/calendar', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection;
        const collection = db.collection('shifts');
        const shifts = await collection.find().toArray();

        const events = shifts
            .filter(shift => shift.date && shift.start && shift.end && shift.employee)
            .map(shift => ({
                title: `${shift.start} - ${shift.end}`,     // Vi viser start og slut i titlen
                start: `${shift.date}T${shift.start}`,       // ISO format
                end: `${shift.date}T${shift.end}`,           // ISO format
                resourceId: shift.employee                  // ⬅️ NØGLE: Sørg for resourceId bliver tilføjet!
            }));

        const resources = [...new Set(shifts.map(shift => shift.employee))]
            .filter(name => name) // Fjern evt. tomme navne
            .map(name => ({ id: name, title: name }));

        console.log("✅ Events:", events);
        console.log("✅ Resources:", resources);

        res.render('employee_calendar', { events, resources });
    } catch (err) {
        console.error('Fejl i /employee/calendar:', err);
        res.status(500).send('Server fejl');
    }
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

// Logout
router.get('/logout', user_controller.logout);

module.exports = router;
