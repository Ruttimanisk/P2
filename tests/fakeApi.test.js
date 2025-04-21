const { getUser } = require('../public/scripts/fakeApi.js');

test('get user with id 1', async () => {
    const user = await getUser(1);
    expect(user).toEqual({id: 1, name: 'Alice'});
});

test('get usr with id 2', async () => {
   const user = await getUser(2);
   expect(user).toEqual({id: 2, name: 'Bob'});
});

test('throws error for unknown user', async () => {
    await expect(getUser(3)).rejects.toThrow("User not found");
});