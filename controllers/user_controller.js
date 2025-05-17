const User = require("../models/user");
const Absence = require("../models/absence")
const asyncHandler = require("express-async-handler");
const { validationResult } = require('express-validator');
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { startOfWeek, parseISO, isAfter, isEqual, getISOWeek, addWeeks, addDays, format } = require('date-fns');

const toUTCStartOfDay = (date) => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

function timeToMinutes(timeStr) {
    try {
        const [hourStr, minStr] = timeStr.split(":");
        const hour = parseInt(hourStr, 10);
        const min = parseInt(minStr, 10);

        if (
            isNaN(hour) || isNaN(min) ||
            hour < 0 || hour > 23 ||
            min < 0 || min > 59
        ) {
            throw new Error("Time out of range");
        }

        return hour * 60 + min;
    } catch (e) {
        throw new Error("Invalid time format. Expected 'HH:MM'");
    }
}

exports.login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('login', { errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username: username }).maxTimeMS(5000).exec();

        if (!user || user.password !== password) {
            return res.status(401).render('login', { errors: ['Invalid username or password'] });
        }

        res.cookie('userId', user._id.toString(), {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.redirect(`/${(user.status || '').toLowerCase()}/home`);

    } catch (err) {
        return res.status(500).render('login', { errors: [`login error in catch: ${err.name}, ${err.message}`] });
    }
});

exports.logout = asyncHandler(async (req, res) => {
    res.clearCookie('userId');
    res.render('login')
});

exports.employee_home = asyncHandler( async(req, res) => {
    res.render('employee_home', {title: "Home Page"});
});

// ---------------------- ADMIN PAGES ---------------------- //

exports.admin_home = asyncHandler( async(req, res) => {
    res.render('admin_home', {title: "Home Page"});
});

exports.edit_schedule_get = asyncHandler(async (req, res) => {
    // burde bare finde schedules med currentWeekStart(udfra weekIndex) <= week_start_date < nextWeekStart

    const allSchedules = await mongoose.connection.collection('schedules').find().sort({ week_start_date: 1, employee: 1 }).toArray();
    const users = await User.find().exec();
    const userMap = {};
    users.forEach(u => {
        userMap[u._id.toString()] = u;
    });

    const weekIndex = parseInt(req.query.week) || 0;
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekNumber = getISOWeek(currentWeekStart);
    const schedulesByWeek = [];

    allSchedules.forEach(schedule => {
        const scheduleDate = parseISO(schedule.week_start_date);

        if (isAfter(scheduleDate, currentWeekStart) || isEqual(scheduleDate, currentWeekStart)) { // filters out previous weeks
            let week = schedulesByWeek.find(w => w.week_start_date === schedule.week_start_date);
            if (week) {
                week.schedules.push(schedule);
            } else {
                schedulesByWeek.push({
                    week_start_date: schedule.week_start_date,
                    schedules: [schedule]
                });
            }
        }
    });

    res.render("admin_edit_schedule", {
        schedules: allSchedules,
        schedulesByWeek: schedulesByWeek,
        weekIndex: weekIndex,
        weekNumber: weekNumber,
        userMap: userMap,
    });
});

exports.edit_schedule_post = asyncHandler(async (req, res) => {
    const weekIndex = parseInt(req.query.week) || 0;
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const displayedWeekStart = addWeeks(currentWeekStart, weekIndex);
    const nextWeekStart = addWeeks(currentWeekStart, weekIndex + 1);

    const schedules = await mongoose.connection.collection('schedules')
        .find({
            $or: [
                { week_start_date: displayedWeekStart },
                { week_start_date: format(displayedWeekStart, 'yyyy-MM-dd') }
            ]
        })
        .sort({ employee: 1 })
        .toArray();

    for (const schedule of schedules) {
        const updatedSchedule = {
            employee: schedule.employee,
            week_start_date: schedule.week_start_date,
        };

        let dayCounter = 0;

        for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
            const startInput = req.body[`${schedule.employee}_week_${weekIndex}_${day}_start`] || '';
            const endInput = req.body[`${schedule.employee}_week_${weekIndex}_${day}_end`] || '';

            updatedSchedule[`${day}_start`] = startInput;
            updatedSchedule[`${day}_end`] = endInput;

            if (startInput && endInput) {
                await mongoose.connection.collection('shifts').updateOne(
                    {
                        employee: schedule.employee,
                        weekday: day,
                        date: { $gte: format(displayedWeekStart, 'yyyy-MM-dd'), $lt: format(nextWeekStart, 'yyyy-MM-dd') }
                    },
                    {
                        $set: {
                            start: startInput,
                            end: endInput,
                            employee: schedule.employee,
                            date: format(addDays(displayedWeekStart, dayCounter), 'yyyy-MM-dd'),
                            weekday: day,
                        }
                    },
                    { upsert: true }
                );
            }

            dayCounter += 1;
        }

        await mongoose.connection.collection('schedules').updateOne(
            { _id: schedule._id },
            { $set: updatedSchedule }
        );
    }

    res.redirect(`/admin/edit_schedule?week=${weekIndex}`);
});


// de her skal ændres
exports.show_admin_schedule = asyncHandler(async (req, res) => {
    const userId = req.cookies.userId;
    const scheduleFile = path.join(__dirname, "../schedules.json");
    let scheduleData = {};

    try {
        if (fs.existsSync(scheduleFile)) {
            const fileData = await fs.promises.readFile(scheduleFile, "utf8");
            scheduleData = JSON.parse(fileData);
        }

        const schedule = scheduleData[userId] || {
            Monday: "", Tuesday: "", Wednesday: "", Thursday: "",
            Friday: "", Saturday: "", Sunday: ""
        };

        res.render("admin_schedule", {
            schedule: schedule,
            userId: userId
        });

    } catch (err) {
        console.error("Error loading admin schedule:", err);
        res.status(500).send("Internal Server Error");
    }
});

exports.show_employee_schedule = asyncHandler(async (req, res) => {
    const userId = req.cookies.userId;
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
});

/*
exports.save_edited_schedule = (req, res) => {
    const flatData = req.body;
    const schedulePath = path.join(__dirname, "../schedules.json");

    const newSchedule = {};

    for (let key in flatData) {
        // Skip dropdowns – they'll be handled via companion key
        if (key.endsWith("_preset")) continue;

        const [username, day] = key.split(".");
        const typedValue = flatData[key];
        const dropdownValue = flatData[`${username}.${day}_preset`] || "";

        const finalValue = typedValue.trim() || dropdownValue;

        if (!newSchedule[username]) newSchedule[username] = {};
        newSchedule[username][day] = finalValue;
    }

    try {
        fs.writeFileSync(schedulePath, JSON.stringify(newSchedule, null, 2), "utf8");
        res.redirect("/admin/edit_schedule");
    } catch (err) {
        console.error("Error saving schedule:", err);
        res.status(500).send("Failed to save schedule.");
    }
};

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

exports.save_employee_schedule = async (req, res) => {
    const userId = req.params.id;
    const newSchedule = req.body.schedule; // expecting schedule to be an object
    const scheduleFile = path.join(__dirname, "../schedules.json");

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




exports.profile_old = (req, res) => {
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
*/
exports.admin_user_creation = asyncHandler(async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('admin_user_creation', { errors: errors.array() });
    }

    const userExists = await User.findOne({ first_name: req.body.first_name, family_name: req.body.family_name })
        .collation({ locale: "en", strength: 2 })
        .exec();
    if (userExists){
        return res.status(401).render('admin_user_creation', { errors: ['A user with the same name already exists.'] });
    }

    const user = new User({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: undefined,
        address: req.body.address,
        hours_per_week: req.body.hours_per_week,
        hourly_rate: req.body.hourly_rate,
        role: req.body.role,
        status: req.body.status,
        contract: req.body.contract === "" ? undefined : req.body.contract,
        username: req.body.username,
        password: req.body.password,
    });

    await user.save();
    res.redirect(`/admin/home`)
});

exports.profile = asyncHandler(async (req, res) => {
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));

    try {
        const userId = req.cookies.userId;
        const user = await User.findOne({ _id: userId });

        const schedules = await mongoose.connection.collection('schedules').find( { employee: userId, week_start_date: format(currentWeekStart, 'yyyy-MM-dd') } ).sort({ week_start_day: 1 }).toArray();

        let minutesWorked = 0;

        for (const schedule in schedules) {
            for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
                minutesWorked += timeToMinutes(schedule[`${day}_end`]) - timeToMinutes(schedule[`${day}_start`])
            }
        }

        const payThisWeek = (minutesWorked / 60) * user.hourly_rate

        if (!user) {
            return res.status(404).send('User not found');
        }

        let view = ""

        if (user.status === 'Admin'){
            view = 'admin_profile'
        }
        else { view = 'employee_profile'}

        return res.render(view, {
                fullname: user.fullname,
                lifespan: user.lifespan,
                statuss: user.status,
                role: user.role,
                address: user.address,
                hourly_rate: user.hourly_rate,
                hours_per_week: user.hours_per_week,
                userId: userId,
                payThisWeek: payThisWeek,
                view_profile: false,
            })

    } catch (err) {
        return res.status(500).send(`profile error in catch: ${err.name}, ${err.message}`)
    }
})

exports.view_profile = asyncHandler(async (req, res) => {
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));

    try {
        const userId = req.params.userId;
        const user = await User.findOne({_id: userId});

        const schedules = await mongoose.connection.collection('schedules').find( { employee: userId, week_start_date: format(currentWeekStart, 'yyyy-MM-dd') } ).sort({ week_start_day: 1 }).toArray();

        let minutesWorked = 0;

        for (const schedule in schedules) {
            for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
                minutesWorked += timeToMinutes(schedule[`${day}_end`]) - timeToMinutes(schedule[`${day}_start`])
            }
        }

        const payThisWeek = (minutesWorked / 60) * user.hourly_rate

        if (!user) {
            return res.status(404).send('User not found');
        }
        else {
            return res.render('admin_profile', {
                fullname: user.fullname,
                lifespan: user.lifespan,
                statuss: user.status,
                role: user.role,
                address: user.address,
                hourly_rate: user.hourly_rate,
                hours_per_week: user.hours_per_week,
                userId: userId,
                payThisWeek: payThisWeek,
                view_profile: true,
            })
        }

    } catch (err) {
        return res.status(500).send(`view profile error in catch: ${err.name}, ${err.message}`)
    }
})

exports.update_profile_get = asyncHandler(async (req,res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({_id: userId});

        if (!user) {
            return res.status(404).send('User not found');
        }
        else {
            return res.render('admin_update_profile', {
                first_name: user.first_name,
                family_name: user.family_name,
                date_of_birth: user.date_of_birth.toISOString().split('T')[0],
                statuss: user.status,
                role: user.role,
                address: user.address,
                hourly_rate: user.hourly_rate,
                hours_per_week: user.hours_per_week,
                userId: userId,
            })
        }

    } catch (err) {
        return res.status(500).send(`update profile error in catch: ${err.name}, ${err.message}`)
    }
})

exports.update_profile_post = asyncHandler(async (req,res) => {
    const userId = req.params.userId;
    const user_old = await User.findOne({_id: userId});

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).render('admin_update_profile', {
            first_name: user_old.first_name,
            family_name: user_old.family_name,
            date_of_birth: user_old.date_of_birth.toISOString().split('T')[0],
            statuss: user_old.status,
            role: user_old.role,
            address: user_old.address,
            hourly_rate: user_old.hourly_rate,
            hours_per_week: user_old.hours_per_week,
            userId: userId,
            errors: errors.array()
        });
    }

    try {
        const user = new User({
            _id: user_old._id,
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: user_old.date_of_death,
            address: req.body.address,
            hours_per_week: req.body.hours_per_week,
            hourly_rate: req.body.hourly_rate,
            role: req.body.role,
            status: req.body.status,
            contract: user_old.contract,
            username: user_old.username,
            password: user_old.password,
        });

        await User.updateOne(
            { _id: userId },
            { $set: user }
        );
        res.redirect(`/admin/view_profile/${userId}`)

    } catch (err) {
        return res.status(500).render('admin_update_profile', {
            first_name: user_old.first_name,
            family_name: user_old.family_name,
            date_of_birth: user_old.date_of_birth.toISOString().split('T')[0],
            statuss: user_old.status,
            role: user_old.role,
            address: user_old.address,
            hourly_rate: user_old.hourly_rate,
            hours_per_week: user_old.hours_per_week,
            userId: userId,
            errors: [`update post error: ${err.name}, ${err.message}`]
        });
    }
});


exports.admin_employee_list = asyncHandler(async (req, res) => {
        const [allEmployees, allAdmins] = await Promise.all([
        User.find({ status: 'Employee'}).sort({ first_name: 1 }).exec(),
        User.find({ status: 'Admin'}).sort({ first_name: 1 }).exec(),
    ]);

    res.render("admin_employee_list", {
        title: "Employee List",
        employees: allEmployees,
        admins: allAdmins,
    });
});

exports.absence_get = asyncHandler(async (req,res) => {
    const [users, current_absence] = await Promise.all([
        User.find().sort({ first_name: 1 }).exec(),
        Absence.find().populate("user").exec()
    ]);

    try {
        await Absence.updateMany(
            { leave_end: { $lt: new Date() }},
            { $set: { archived: true } }
        );

        res.render("admin_absence", {
            users: users,
            current_absence: current_absence,
        });

    } catch (err) {
        return res.status(500).render("admin_absence", {
            users: users,
            current_absence: current_absence,
            errors: [`Failed in archive expired absence: ${err.name}, ${err.message}`]
        })
    }
})

exports.absence_post = asyncHandler(async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('absence', { errors: errors.array() });
    } else {
        const absence = new Absence({
            user: req.body.user,
            reason: req.body.reason,
            leave_start: req.body.leave_start,
            leave_end: req.body.leave_end,
        });

        await absence.save();
        res.redirect(`/admin/absence`)
    }
});