console.log('Populating users and userschedules.')

const userArgs = process.argv.slice(2);

const User = require("./models/user")
const UserSchedule = require("./models/userschedule")

users = [];
userschedules = [];

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

async function userCreate(index, first_name, family_name, date_of_birth, date_of_death, address,hours_per_week, hourly_rate, role, status, contract, username, password) {
    const userdetail = {
        first_name: first_name,
        family_name: family_name,
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
    console.log(`Added user: ${first_name} ${family_name}`)
}


async function userscheduleCreate(index, overtime, user, sick, monday, tuesday, wednesday, thursday, friday) {
    const userscheduledetail = {
        user: user,
        overtime: overtime,
        sick: sick,
        monday: monday,
        tuesday: tuesday,
        wednesday: wednesday,
        thursday: thursday,
        firday: friday,
    };

    const userschedule = new UserSchedule(userscheduledetail);
    await userschedule.save();
    userschedules[index] = userschedule;
    console.log(`Added userschedule for: ${user.first_name} ${user.family_name}`)
}


async function createUsers() {
    console.log("adding users");
    await Promise.all([
        userCreate(0, "Mads", "Cajar", "1010-10-10", undefined, "Tenstreet 10", "10", "10", "Servant", "employee", undefined, "mads1234", "1234"),
        userCreate(1, "Peter", "Cornholio Rasmussen", "2020", undefined, "Twentystreet 20", "20", "20", "Big Boss", "admin", undefined, "peter12345", "12345")
    ]);
}


async function createUserSchedules() {
    console.log("adding users");
    await Promise.all([
        userscheduleCreate(0, users[0], 0, false, ["08:00", "10:00", ""], ["08:00", "10:00", ""], ["08:00", "10:00", ""], ["08:00", "10:00", ""], ["08:00", "10:00", ""]),
        userscheduleCreate(1, users[1], 0, false, ["08:00", "12:00", ""], ["08:00", "12:00", ""], ["08:00", "12:00", ""], ["08:00", "12:00", ""], ["08:00", "12:00", ""])
    ]);
}