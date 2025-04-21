const { delayedDivision } = require('./mathUtils');

async function safeDivide(a, b) {
    try {
        const result = await delayedDivision(a, b);
        return result;
    } catch (error) {
        return error.message;
    }
}

module.exports = { safeDivide };