const express = require("express");
const router = express.Router();

const user_controller = require("../controllers/user_controller");
const userschedule_controller = require("../controllers/userschedule_controller");

// med rotes herfra skal man gå ud fra at de allerede er på /employee/
// tilføj requireAuth til alle når vi har fået login til at fungere
// skal se sådan her ud: router.get('/home', requireAuth, user_controller.home)

router.get('/home', user_controller.employee_home)

// router.get('/schedule', userschedule_controller.schedule)


router.get('/profile_old', (req, res) => {
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
router.get('/profile', user_controller.profile_from_database);

router.get('/logout', user_controller.logout)


module.exports = router;