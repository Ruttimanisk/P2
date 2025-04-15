const User = require("../models/user");
const UserSchedule = require("../models/userschedule");
const asyncHandler = require("express-async-handler");

exports.shared_schedule = asyncHandler( async (req, res, next) => {
    const allSchedules = await UserSchedule.find().exec();
    res.redirect(`/schedule`)
});

exports.csv_input_data = asyncHandler( async (req, res) => {
    const allSchedules = await UserSchedule.find().exec();
    let input = []
    input.forEach((schedule) => {
        
    })
})