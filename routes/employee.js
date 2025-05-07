const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");
const { requireAuth } = require("../middleware/auth");
const mongoose = require("mongoose");

// med rotes herfra skal man gå ud fra at de allerede er på /employee/
// tilføj requireAuth til alle når vi har fået login til at fungere
// skal se sådan her ud: router.get('/home', requireAuth, user_controller.home)

router.get('/home',  requireAuth, user_controller.employee_home)

router.get('/schedule', requireAuth, user_controller.show_employee_schedule)

router.get('/calendar', requireAuth, async (req, res) => {
    const db = mongoose.connection;
    const collection = db.collection('Schedule');
    const shifts = await collection.find().toArray();

    // Byg events og resources
    const events = shifts
        .filter(shift => shift.date && shift.start && shift.end && shift.employee)
        .map(shift => ({
            title: shift.employee,
            start: `${shift.date}T${shift.start}`,
            end: `${shift.date}T${shift.end}`
        }));

    const resources = [...new Set(shifts.map(shift => shift.employee))]
        .map(name => ({ id: name, title: name }));

    res.render('employee_calendar', { events, resources }); // 👈 Korrekt render
});


router.get('/prof_old',  requireAuth, (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.redirect('/login');
    }

    const usersPath = path.join(__dirname, '../user_info.json'); // adjust as needed
    const users = JSON.parse(fs.readFileSync(usersPath));

    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).send('User not found');
    }

    res.render('profile', {
        name: user.first_name,
        status: user.status
    });
});

// recreated profile
router.get('/profile',  requireAuth, user_controller.profile);

router.get('/logout', user_controller.logout)


module.exports = router;