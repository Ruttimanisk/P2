const { isEven, divide, delayedDivision } = require('../public/scripts/mathUtils');
const { safeDivide } = require('../public/scripts/calculator')

test('4 is even', () => {
    expect(isEven(4)).toBe(true);
});

test('5 is odd', () => {
    expect(isEven(5)).toBe(false);
});

test('b is not 0', () => {
    expect(divide(2,2)).toBe(1);
});

test('b is 0', () => {
    expect(() => divide(10,0)).toThrow('Cannot divide by zero');
});

test('10 divided by 2 after delay', async () => {
    const result = await delayedDivision(10, 2);
    expect(result).toBe(5);
});
test('throws error when dividing by 0', async () => {
    await expect(delayedDivision(10, 0)).rejects.toThrow("Cannot divide by zero");
});

test('safe divide returns result', async () => {
    const result = await safeDivide(20, 4);
    expect(result).toBe(5);
});

test('safe divide returns error', async () => {
    const result = await safeDivide(20, 0);
    expect(result).toBe('Cannot divide by zero');
});