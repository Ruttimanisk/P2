const User = require("../models/user");
const UserSchedule = require("../models/userSchedule");
const asyncHandler = require("express-async-handler");


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
