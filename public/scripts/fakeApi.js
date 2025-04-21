function getUser(id) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const users = {
                1: {id: 1, name: 'Alice'},
                2: {id: 2, name: 'Bob'}
            };

            const user = users[id];
            if(user) {
                resolve(user);
            } else {
                reject(new Error("User not found"));
            }
        }, 1000);
    });
}

module.exports ={ getUser }