const User = require("../models/user");
const UserSchedule = require("../models/userschedule");
const asyncHandler = require("express-async-handler");
const { validationResult } = require('express-validator');


exports.user_list = asyncHandler(async (req, res, next) => {
        const [allEmployees, allAdmins] = await Promise.all([
        User.find({ status: 'employee'}).sort({ first_name: 1 }).exec(),
        User.find({ status: 'admin'}).sort({ first_name: 1 }).exec(),
    ]);

    res.render("admin_employees", {
        title: "User List",
        employees: allEmployees,
        admins: allAdmins,
    });
});

exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        // måske fejl pga ingen database (kan ikke finde user mappen)
        const user = await User.findOne({ username: username.trim() });
        if (!user || user.password !== password) {
            return res.status(401).render('login', { errors: 'Invalid username or password' });
        }

        res.cookie('userId', user._id.toString(), {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.send('Login successful');
        res.redirect(`/${user.status}`);

    } catch (err) {
        console.error(err);
        res.redirect('/');
        //res.status(500).send('Server error');
    }
};