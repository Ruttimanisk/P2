const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const AbsenceSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, enum: ["Sick", "PTO", "M/Paternity"]},
    leave_start: { type: Date, required: true },
    leave_end: { type: Date, required: true },
});

module.exports = mongoose.model("Absence", AbsenceSchema);