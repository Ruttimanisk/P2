function isEven(n) {
    return n % 2 === 0;
}

function divide(a, b) {
    if(b === 0) {
        throw new Error('Cannot divide by zero');
    }
    return a/b;
}

function delayedDivision(a, b) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if(b === 0) {
                reject(new Error("Cannot divide by zero"));
            } else {
                resolve(a/b);
            }
        }, 1000);
    });
}

module.exports = { isEven, divide, delayedDivision };