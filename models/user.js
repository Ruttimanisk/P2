const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    first_name: { type: String, required: true, minLength: 2, maxLength: 100 },
    family_name: { type: String, required: true, minLength: 2, maxLength: 100 },
    date_of_birth: { type: Date, required: true },
    date_of_death: { type: Date },
    hourly_rate: { type: Number, required: true },
    status: {
        type: String,
        required: true,
        enum: ["employee", "admin"],
    },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", required: true },
});

UserSchema.virtual("url").get(function () {
    // We don't use an arrow function as we'll need the "this" object
    return `/${this.status}/profile/${this._id}`;
});
UserSchema.virtual("name").get(function () {
    let fullname = "";
    if (this.first_name && this.family_name) {
        fullname = `${this.family_name}, ${this.first_name}`;
    }

    return fullname;
});
UserSchema.virtual("lifespan").get(function() {
    return "" +(this.date_of_birth ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED) : '') +
        (this.date_of_death ? " - " + DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) : '');
})

// Export model
module.exports = mongoose.model("User", UserSchema)