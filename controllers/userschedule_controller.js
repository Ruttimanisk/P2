const User = require("../models/user");
const UserSchedule = require("../models/userschedule");
const asyncHandler = require("express-async-handler");

exports.shared_schedule = asyncHandler( async (req, res, next) => {
    const allSchedules = await UserSchedule.find().populate("user").exec();
    res.redirect(`/schedule`)
});

exports.csv_input_data = asyncHandler( async (req, res) => {
    const allSchedules = await UserSchedule.find().populate("user").exec();

    let csvInput = "Name,HoursContract\n";

    for (let i = 0; i < allSchedules.length; i++) {
        const schedule = allSchedules[i];
        const userId = schedule.user?._id || "N/A";
        const hours = (schedule.hours_this_week / 60).toFixed(2);
        csvInput += `${userId},${hours}\n`;
    }

    // Set headers to make it downloadable
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=schedule_data.csv");
    res.status(200).send(csvInput);
});

exports.saveEditedSchedule = (req, res) => {
    const flatData = req.body;
    const newSchedule = {};

    for (let key in flatData) {
        const [username, day] = key.split('.');
        if (!newSchedule[username]) {
            newSchedule[username] = {};
        }
        newSchedule[username][day] = flatData[key];
    }

    fs.writeFileSync(schedulesFile, JSON.stringify(newSchedule, null, 2));
    res.redirect('/admin/edit_employee_schedule');
};
exports.renderEditSchedule = (req, res) => {
    // Replace with actual schedule rendering logic
    res.render('edit_employee_schedule', { title: 'Edit Schedule' });
};

exports.saveEditedSchedule = (req, res) => {
    // Replace with saving logic later
    res.send('Schedule saved!');
};
