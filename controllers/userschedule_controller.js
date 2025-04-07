const CurrentUser = require("../models/currentUser");
const UserSchedule = require("../models/userSchedule");
const asyncHandler = require("express-async-handler");

exports.shared_schedule = asyncHandler( async (req, res, next) => {
    const allSchedules = await UserSchedule.find().exec();
    res.render(`${currentUser.user.status}_schedule`, {
        title: "Schedule",
        shared_schedule: allSchedules,
    });
});