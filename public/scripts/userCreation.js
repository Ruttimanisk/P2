// require og appendfile kræver node.js (website køres på server), da man ikke kan ændre filer på computeren gennem en browser pga sikkerhed.
function createUser() {
    if (confirm("Are you sure you want to create this user?")) {
        const fullName = document.querySelector("#newFullname");
        const username = document.querySelector("#newUsername");
        const password = document.querySelector("#newPassword");
        const status = document.querySelector("#newStatus");

        const fs = require('fs');

        const newUser = "" + fullName + username + password + status

        fs.appendFile('../TXT/userDatabase.txt', newUser, (err) => {
            if (err) {
                console.error('Error appending to file:', err);
                return;
            }
            console.log('Line added successfully!');
        });
    }
}