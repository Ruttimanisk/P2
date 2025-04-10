const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;

// DateTime.TIME_24_SIMPLE
const UserScheduleSchema = new Schema ({
   user: { type: Schema.Types.ObjectId, ref: "User", required: true },
   overtime: {type: Number, required: true},
   sick: {type: [Boolean, Number], default: [false, 0]}, // boolean and full days sick
   // start time, end time, optional comment - time uses format: xx:xx
   monday: {type: [String, String, String], required: true},
   tuesday: {type: [String, String, String], required: true},
   wednesday: {type: [String, String, String], required: true},
   thursday: {type: [String, String, String], required: true},
   friday: {type: [String, String, String], required: true},
});

UserScheduleSchema.virtual("url").get(function () {
    return `/${this.user.status}_profile/${this.user}/schedule`;
});
// hope this works, can't really test it.
UserScheduleSchema.virtual("hours_this_week").get(function () {
    let sum = 0
    let week = [this.monday, this.tuesday, this.wednesday, this.thursday, this.friday]
    for(let i = 0; i < 5; i++){
        let timeParts1 = week[i][0].split(":");
        let time1 = Number(timeParts1[0]) * 60 + Number(timeParts1[1])
        let timeParts2 = week[i][1].split(":");
        let time2 = Number(timeParts2[0]) * 60 + Number(timeParts2[1])
        if(time1 > time2){
            return res.status(400).send('start time after end time')
        } else {
            sum += time2 - time1
        }
    }
    return sum;
});

// Export model
module.exports = mongoose.model("UserSchedule", UserScheduleSchema);