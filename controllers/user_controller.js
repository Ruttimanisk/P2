const User = require("../models/user");
const UserSchedule = require("../models/userschedule");
const asyncHandler = require("express-async-handler");
const { validationResult } = require('express-validator');
const fs = require("fs");
const path = require("path");


exports.user_list = asyncHandler(async (req, res, next) => {
        const [allEmployees, allAdmins] = await Promise.all([
        User.find({ status: 'Employee'}).sort({ first_name: 1 }).exec(),
        User.find({ status: 'Admin'}).sort({ first_name: 1 }).exec(),
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

        return res.redirect(`/${user.status}/home`);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

exports.logout = asyncHandler(async (req, res) => {
    if (confirm("Are you sure you want to log out?") === true) {
        res.clearCookie('userId');
        res.render('login')
    }
});

// ---------------------- ADMIN PAGES ---------------------- //

exports.home = asyncHandler( async(req,res,next) => {
    res.render("admin_home", {title: "Home Page"});
});


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

// (Additional functions for scheduling can be implemented similarly)
exports.list_employees_for_schedule_edit = async (req, res) => {
    const filePath = path.join(__dirname, "../user_info.json");

    try {
        const data = await fs.promises.readFile(filePath, "utf8");
        const users = JSON.parse(data);
        const employees = users.filter(u => u.status === "employee");

        res.render("admin_edit_employee_list", {
            title: "Edit Employee Schedules",
            employees: employees
        });
    } catch (err) {
        console.error("Error loading users for schedule edit:", err);
        res.status(500).send("Internal Server Error");
    }
};

exports.show_employee_schedule = async (req, res) => {
    const username = req.params.id;
    const filePath = path.join(__dirname, "../user_info.json");

    try {
        const data = await fs.promises.readFile(filePath, "utf8");
        const users = JSON.parse(data);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("admin_edit_employee_schedule", {
            title: `Edit Schedule for ${user.first_name} ${user.last_name}`,
            employee: employee
        });

    } catch (err) {
        console.error("Failed to load user:", err);
        res.status(500).send("Internal Server Error");
    }
};

exports.save_employee_schedule = async (req, res) => {
    const userId = req.params.id;
    const newSchedule = req.body.schedule; // expecting schedule to be an object
    const scheduleFile = path.join(__dirname, "../schedule.json");

    try {
        let schedule = {};
        if (fs.existsSync(scheduleFile)) {
            const data = await fs.promises.readFile(scheduleFile, "utf8");
            schedule = JSON.parse(data);
        }

        schedule[userId] = newSchedule;

        await fs.promises.writeFile(scheduleFile, JSON.stringify(schedule, null, 2));
        res.redirect(`/admin/edit_employee_schedule/${userId}`);
    } catch (err) {
        console.error("Error saving schedule:", err);
        res.status(500).send("Failed to save schedule");
    }
};

exports.profile = (req, res) => {
    const username = req.session.username;
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../user_info.json')));
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).send('User not found');
    }

    res.render('profile', {
        name: user.first_name,  // Make sure the JSON contains "firstName"
        status: user.status     // Ensure it's "status", not "role"
    })
};

// remaking profile with database - Mads

exports.profile_from_database = asyncHandler(async (req, res) => {
    const userId = req.cookies.userId;
    const user = await User.findOne({ _id: userId });

    if (!user) {
        return res.status(404).send('User not found');
    }

    res.render('profile', {
        first_name: user.first_name,
        fullname: user.fullname,
        lifespan: user.lifespan,
        statuss: user.status,
        address: user.address,
        hourly_rate: user.hourly_rate,
        hours_per_week: user.hours_per_week,

    })
})