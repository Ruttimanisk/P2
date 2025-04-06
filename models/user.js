const mongoose = require("mongoose");
const {DateTime} = require("luxon");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    first_name: { type: String, required: true, maxLength: 50 },
    family_name: { type: String, required: true, maxLength: 50 },
    date_of_birth: { type: Date, required: true },
    date_of_death: { type: Date },
    address: { type: String},
    hourly_rate: { type: Number, required: true },
    status: { type: String, required: true, enum: ["employee", "admin"] },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", required: true }, // maybe just store the contract here
    username: { type: String, required: true, maxLength: 50 }, // not sure if we need a separate model for login details
    password: { type: String, required: true, maxLength: 50 },
});


UserSchema.virtual("url").get(function () {
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