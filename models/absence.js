const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;

const AbsenceSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, enum: ["Sick", "PTO", "M/Paternity"]},
    leave_start: { type: Date, required: true },
    leave_end: { type: Date, required: true },
});

AbsenceSchema.virtual("leave_start_short").get(function() {
    return "" +(this.leave_start ? DateTime.fromJSDate(this.leave_start).toLocaleString(DateTime.DATE_MED) : '')
});

AbsenceSchema.virtual("leave_end_short").get(function() {
    return "" +(this.leave_end ? DateTime.fromJSDate(this.leave_end).toLocaleString(DateTime.DATE_MED) : '')
});

module.exports = mongoose.model("Absence", AbsenceSchema);