const User = require("../models/user");
const UserSchedule = require("../models/userschedule");
const asyncHandler = require("express-async-handler");

exports.shared_schedule = asyncHandler( async (req, res, next) => {
    const allSchedules = await UserSchedule.find().exec();
    res.render(`${req.user.status}_schedule`, {
        title: "Schedule",
        shared_schedule: allSchedules,
    });
});