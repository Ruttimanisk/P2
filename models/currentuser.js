const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;

const CurrentUserSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    login_time: {type: DateTime, required: true}
});

// Export model
module.exports = mongoose.model("CurrentUser", CurrentUserSchema)

// found out that we probably don't need this model