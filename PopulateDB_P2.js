const userArgs = process.argv.slice(2);

// import models as const here
const User = require("./models/user")
const UserSchedule = require("./models/userschedule")

users = [];
userschedules = [];

// make empty arrays for each model

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const mongoDB = userArgs[0];

main().catch((err) => console.log(err));

async function main() {
    console.log("Debug: About to connect");
    await mongoose.connect(mongoDB);
    console.log("Debug: Should be connected?");

    await createUsers();
    await createUserSchedules();

    console.log("Debug: Closing mongoose");
    mongoose.connection.close();
}

async function userCreate(index, first_name, last_name, date_of_birth, date_of_death, address,hours_per_week, hourly_rate, role, status, contract, username, password) {
    const userdetail = {
        first_name: first_name,
        family_name: last_name,
        date_of_birth: date_of_birth,
        hours_per_week: hours_per_week,
        hourly_rate: hourly_rate,
        role: role,
        status: status,
        contract: contract,
        username: username,
        password: password,
    };
    if (date_of_death !== false) userdetail.date_of_death = date_of_death
    if (address !== false) userdetail.address = address

    const user = new User(userdetail);
    await user.save();
    users[index] = user;
    console.log(`Added user: ${first_name} ${last_name}`)
}


async function userscheduleCreate(index, user, sick, monday, tuesday, wednesday, thursday )


async function createUsers() {
    console.log("adding users");
    await Promise.all([
        userCreate(0, "Mads", "Cajar", "1010-10-10", undefined, "Tenstreet 10", "10", "10", "Servant", "employee", undefined, "mads1234", "1234"),
        userCreate(1, "Peter", "Cornholio Rasmussen", "2020", undefined, "Twentystreet 20", "20", "20", "Big Boss", "admin", undefined, "peter12345", "12345")
    ]);
}