const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;
const time_24 = DateTime.TIME_24_SIMPLE

const UserScheduleSchema = new Schema ({
   user: { type: Schema.Types.ObjectId, ref: "User", required: true },
   overtime: {type: Number, required: true},
   sick: {type: [Boolean, Number], default: [false, 0]}, // boolean and full days sick
   // start time, end time, optional comment - time uses format: xx:xx
   monday: {type: [time_24, time_24, String], required: true},
   tuesday: {type: [time_24, time_24, String], required: true},
   wednesday: {type: [time_24, time_24, String], required: true},
   thursday: {type: [time_24, time_24, String], required: true},
   friday: {type: [time_24, time_24, String], required: true},
});

UserScheduleSchema.virtual("url").get(function () {
    return `/${this.user.status}_profile/${this.user}/schedule`;
});
// hope this works, can't really test it.
UserScheduleSchema.virtual("hours_this_week").get(function () {
    let sum = 0
    let week = [this.monday, this.tuesday, this.wednesday, this.thursday, this.friday]

    for(let i = 0; i < 5; i++){
        let duration = week[i][0].diff(week[i][1])
        sum += duration.as('hours')
    }

    return sum;
});

// Export model
module.exports = mongoose.model("UserSchedule", UserScheduleSchema);