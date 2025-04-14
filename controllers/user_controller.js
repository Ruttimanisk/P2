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

exports.login = asyncHandler(async (req, res) => {
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
});




// ---------------------- ADMIN PAGES ---------------------- //

exports.admin_user_creation = asyncHandler(async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('admin_user_creation', { errors: errors.array() });
    } else {
        const user = new User({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        address: req.body.address,
        hours_per_week: req.body.hours_per_week,
        hourly_rate: req.body.hourly_rate,
        role: req.body.role,
        status: req.body.status,
        contract: req.body.contract,
        username: req.body.username,
        password: req.body.password,
        });

        await user.save();
        res.redirect(`/profile/${user._id}`)
    }
});