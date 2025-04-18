const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    first_name: { type: String, required: true, maxLength: 50 },
    family_name: { type: String, required: true, maxLength: 50 },
    date_of_birth: { type: Date, required: true },
    date_of_death: { type: Date },
    address: { type: String},
    hours_per_week: { type: Number, required: true },
    hourly_rate: { type: Number, required: true },
    role: { type: String, required: true },
    status: { type: String, required: true, enum: ["Employee", "Admin"] },
    contract: { type: Schema.Types.ObjectId, ref: "Contract" }, // maybe just store the contract here as binData (if file is < 16mb)
    username: { type: String, required: true, maxLength: 50, unique: true, index: true}, // not sure if we need a separate model for login details
    password: { type: String, required: true, maxLength: 50 },
});


UserSchema.virtual("url").get(function () {
    return `/${this.status}/profile/${this._id}`;
});

UserSchema.virtual("fullname").get(function () {
    let fullname = "";
    if (this.first_name && this.family_name) {
        fullname = `${this.first_name} ${this.family_name}`;
    }
    return fullname;
});

UserSchema.virtual("lifespan").get(function() {
    return "" +(this.date_of_birth ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED) : '') +
        (this.date_of_death ? " - " + DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) : '');
});


// Export model
module.exports = mongoose.model("User", UserSchema)