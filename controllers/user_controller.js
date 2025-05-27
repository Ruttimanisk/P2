const User = require("../models/user");
const Absence = require("../models/absence")
const asyncHandler = require("express-async-handler");
const { validationResult } = require('express-validator');
const mongoose = require("mongoose");
const { startOfWeek, getISOWeek, addWeeks, addDays, format } = require('date-fns');

// Shared Functions:
const toUTCStartOfDay = (date) => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

function timeToMinutes(timeStr) {
        const [hourStr, minStr] = timeStr.split(":");
        const hour = parseInt(hourStr, 10);
        const min = parseInt(minStr, 10);

        return hour * 60 + min;
}

function payThisWeekCalculation(schedules, hourly_rate) { // count hours worked this week and multiply it by hourly rate
    let minutesWorked = 0;
    if (Array.isArray(schedules)) {
        for (const schedule of schedules) {
            for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
                let start = schedule[`${day}_start`]
                let end = schedule[`${day}_end`]

                if (start !== "" && end !== "") {
                    minutesWorked += timeToMinutes(end) - timeToMinutes(start)
                }
            }
        }
    } else { // works even if its not an array
        let schedule = schedules
        for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
                let start = schedule[`${day}_start`]
                let end = schedule[`${day}_end`]

                if (start !== "" && end !== "") {
                    minutesWorked += timeToMinutes(end) - timeToMinutes(start)
                }
            }
    }
    return (minutesWorked / 60) * hourly_rate
}

// Controller Functions:
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

        // create cookie for the logged in user
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
    res.redirect('/')
});

exports.employee_home = asyncHandler(async (req, res) => {
    res.render('employee_home', {title: "Home Page"});
});

exports.calendar = asyncHandler(async (req, res) => {
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

    const employeeIds = [...new Set(shifts.map(shift => shift.employee.toString()))]
        .map(id => new mongoose.Types.ObjectId(id));

    const users = await User.find({ _id: { $in: employeeIds } }).lean({ virtuals: true }).sort({ first_name: 1 });

    const userMap = Object.fromEntries(users.map(user => [user._id.toString(), `${user.first_name} ${user.family_name}`]));

    const resources = employeeIds.map(id => ({
        id: id.toString(),
        title: userMap[id.toString()] || 'Unknown user'
    }));

    console.log(resources.title)
    console.log("Events:", events);
    console.log("Resources:", resources);


    res.render('admin_calendar', {
        events,
        resources
    });
})

exports.admin_home = asyncHandler(async (req, res) => {
    res.render('admin_home', {title: "Home Page"});
});

exports.edit_schedule_get = asyncHandler(async (req, res) => {
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const weekNumber = getISOWeek(currentWeekStart);
    const weekIndex = parseInt(req.query.week) || weekNumber; // selected week
    const displayedWeekStart = addWeeks(currentWeekStart, weekIndex - weekNumber);
    const nextWeekStart = addWeeks(currentWeekStart, weekIndex - weekNumber + 1);

    // find schedules for the selected week
    const schedules = await mongoose.connection.collection('schedules')
        .find({week_start_date: { $gte: format(displayedWeekStart, 'yyyy-MM-dd'), $lt: format(nextWeekStart, 'yyyy-MM-dd') }})
        .toArray();
    const users = await User.find().sort({ first_name: 1 }).exec();

    const scheduleMap = new Map();
    schedules.forEach(schedule => scheduleMap.set(schedule.employee.toString(), schedule));

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const datesForWeek = {}
    for(let i = 0; i < 7; i++) {
        let today = addDays(displayedWeekStart, i)
        datesForWeek[days[i]] = format(today, 'MMMM d')
    }

    res.render("admin_edit_schedule", {
        users: users,
        weekIndex: weekIndex,
        weekNumber: weekNumber,
        scheduleMap: scheduleMap,
        datesForWeek: datesForWeek,
    });
});

exports.edit_schedule_post = asyncHandler(async (req, res) => {
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const weekNumber = getISOWeek(currentWeekStart);
    const weekIndex = parseInt(req.body.weekIndex || req.query.week) || weekNumber;
    const displayedWeekStart = addWeeks(currentWeekStart, weekIndex - weekNumber);
    const nextWeekStart = addWeeks(currentWeekStart, weekIndex - weekNumber + 1);

    const users = await User.find().sort({ first_name: 1 }).exec();
    const scheduleCollection = mongoose.connection.collection('schedules');
    const shiftCollection = mongoose.connection.collection('shifts');

    const schedules = await scheduleCollection
        .find({week_start_date: { $gte: format(displayedWeekStart, 'yyyy-MM-dd'), $lt: format(nextWeekStart, 'yyyy-MM-dd') }})
        .toArray();

    const scheduleMap = new Map();
    schedules.forEach(schedule => scheduleMap.set(schedule.employee.toString(), schedule));

    for (const user of users) {
        const employeeId = user._id;
        const schedule = scheduleMap.get(employeeId.toString())

        const updatedSchedule = {
            employee: employeeId,
            week_start_date: format(displayedWeekStart, 'yyyy-MM-dd'),
        };

        let dayCounter = 0;

        for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
            const startInput = req.body[`${employeeId}_week_${weekIndex}_${day}_start`] || ""; // name from input in view
            const endInput = req.body[`${employeeId}_week_${weekIndex}_${day}_end`] || "";

            // regex for validating timestamp
            const validTimeStart = /^([01]\d|2[0-3]):([0-5]\d)$/.test(startInput);
            const validTimeEnd = /^([01]\d|2[0-3]):([0-5]\d)$/.test(endInput);

            if ((startInput !== "" && !validTimeStart) || (endInput !== "" && !validTimeEnd)) {
                continue
            }

            if (startInput === "" && endInput === "") {
                await shiftCollection.deleteOne(
                    {
                        employee: employeeId,
                        weekday: day,
                        date: {
                            $gte: format(displayedWeekStart, 'yyyy-MM-dd'),
                            $lt: format(nextWeekStart, 'yyyy-MM-dd')
                        }
                    }
                )
            }

            else if (startInput && endInput) {
                await shiftCollection.updateOne(
                    {
                        employee: employeeId,
                        weekday: day,
                        date: { $gte: format(displayedWeekStart, 'yyyy-MM-dd'), $lt: format(nextWeekStart, 'yyyy-MM-dd') }
                    },
                    {
                        $set: {
                            start: startInput,
                            end: endInput,
                            employee: employeeId,
                            date: format(addDays(displayedWeekStart, dayCounter), 'yyyy-MM-dd'),
                            weekday: day,
                        }
                    },
                    { upsert: true }
                );
            }

            updatedSchedule[`${day}_start`] = startInput;
            updatedSchedule[`${day}_end`] = endInput;

            dayCounter++;
        }
        // update if schedule exists or create a new document
        if (schedule) {
            await scheduleCollection.updateOne(
                { _id: schedule._id },
                { $set: updatedSchedule }
            );
        } else {
            await scheduleCollection.insertOne(updatedSchedule);
        }
    }

    res.redirect(`/admin/edit_schedule?week=${weekIndex}`);
});

exports.admin_user_creation = asyncHandler(async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('admin_user_creation', { errors: errors.array() });
    }
    // check if the user already exists
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
    let payThisWeek = 0

    try {
        const userId = req.cookies.userId;
        const user = await User.findOne({ _id: userId });

        const schedule = await mongoose.connection.collection('schedules').findOne(
            {
                employee: user._id,
                week_start_date: format(currentWeekStart, 'yyyy-MM-dd')
            })

        payThisWeek = payThisWeekCalculation(schedule, user.hourly_rate)

        if (!user) {
            return res.status(404).send('User not found');
        }

        let view
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
            })

    } catch (err) {
        return res.status(500).send(`profile error in catch: ${err.name}, ${err.message}`)
    }
})

exports.view_profile = asyncHandler(async (req, res) => {
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));
    let payThisWeek = 0

    try {
        const userId = req.params.userId;
        const user = await User.findOne({_id: userId});

        const schedules = await mongoose.connection.collection('schedules').find(
            {
                employee: user._id,
                week_start_date: format(currentWeekStart, 'yyyy-MM-dd')
            })
            .sort({ week_start_day: 1 })
            .toArray();

        payThisWeek = payThisWeekCalculation(schedules, user.hourly_rate)

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
    const currentWeekStart = toUTCStartOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // make one array with both employees and admins
    const users = allEmployees.concat(allAdmins);

    let totalPay = 0
    let individualPay = {}
    let hourlyRate = {}

    for (const user of users) {
        let schedules = await mongoose.connection.collection('schedules').find(
            {
                employee: user._id,
                week_start_date: format(currentWeekStart, 'yyyy-MM-dd')
            })
            .sort({ week_start_day: 1 })
            .toArray();

        let payThisWeek = payThisWeekCalculation(schedules, user.hourly_rate)
        totalPay += payThisWeek
        hourlyRate[user] = user.hourly_rate
        individualPay[user] = payThisWeek

    }

    res.render("admin_employee_list", {
        title: "Employee List",
        employees: allEmployees,
        admins: allAdmins,
        users: users,
        totalPay: totalPay,
        hourlyRate: hourlyRate,
        individualPay: individualPay,
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