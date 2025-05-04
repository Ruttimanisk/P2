const { login } = require('../controllers/user_controller'); // your controller file
const { validationResult } = require('express-validator');
const User = require('../models/user'); // your User model

jest.mock('express-validator');
jest.mock('../models/user');

// Bundles the test in the body together, linked to the beforeEach-hook
describe('login controller', () => {
    let req, res;

    // Resets the values of req and res before each test (within the describe function),
    // so they don't interfere with eachother

    beforeEach(() => {
        req = {
            body: {
                username: 'testuser',
                password: 'password123',
            },
            cookies: {},
        };
        // Initiates spy-functions, to let Jest know what is going on
        res = {
            status: jest.fn(() => res),
            render: jest.fn(),
            redirect: jest.fn(),
            cookie: jest.fn(),
        };
    });

    test('should render error if validation fails', async () => {
        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => [{ msg: 'Username is required' }],
        });

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith('login', {
            errors: [{ msg: 'Username is required' }],
        });
    });

    test('should render error if user not found', async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
        });

        User.findOne.mockReturnValue({
            maxTimeMS: () => ({
                exec: () => null,
            }),
        });

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.render).toHaveBeenCalledWith('login', {
            errors: ['Invalid username or password'],
        });
    });

    test('should render error if password is incorrect', async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
        });

        User.findOne.mockReturnValue({
            maxTimeMS: () => ({
                exec: () => ({ username: 'testuser', password: 'correctpassword' }),
            }),
        });

        req.body = {
            username: 'testuser',
            password: 'wrongpassword',
        };

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.render).toHaveBeenCalledWith('login', {
            errors: ['Invalid username or password'],
        });
    });

    test('should redirect on successful login', async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
        });

        User.findOne.mockReturnValue({
            maxTimeMS: () => ({
                exec: () => ({ _id: '12345', password: 'password123', status: 'Admin' }),
            }),
        });

        await login(req, res);

        expect(res.cookie).toHaveBeenCalledWith('userId', '12345', expect.any(Object));
        expect(res.redirect).toHaveBeenCalledWith('/admin/home');
    });

    test('should render error if catch block runs', async () => {
        validationResult.mockReturnValue({
            isEmpty: () => true,
        });

        User.findOne.mockReturnValue({
            maxTimeMS: () => ({
                exec: () => { throw new Error('DB is down'); },
            }),
        });

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalledWith('login', {
            errors: [expect.stringContaining('login error in catch')],
        });
    });
});
