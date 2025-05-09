// Import functions to test
const { login,
        logout,
        employee_home,
        admin_home,
        edit_schedule_get,
        edit_schedule_post} = require('../controllers/user_controller');

// Other Jest dependencies for testing
const { validationResult } = require('express-validator');
const User = require('../models/user');
const mongoose = require('mongoose');


// Classic Jest mock functions initialized for setting up asynch testing
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
            clearCookie: jest.fn()
        };
    });

    test('should render error if validation fails', async () => {

        // Unintuitive, but the error array is NOT empty
        // (there IS an error in validation), so isEmpty method returns false
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

    test('logout to login page and clear cookie', async () => {

        await logout(req, res);

        expect(res.clearCookie).toHaveBeenCalledWith('userId');
        expect(res.render).toHaveBeenCalledWith('login');
    });

    test('redirects to employee home page', async () => {

        await employee_home(req, res);

        expect(res.render).toHaveBeenCalledWith('employee_home', {"title": "Home Page"});
    });

    test('redirects to admin home page', async () => {

        await admin_home(req, res);

        expect(res.render).toHaveBeenCalledWith('admin_home', {"title": "Home Page"});
    });

    test('gets schedule from DB and renders it for editting', async () => {

        // mock a schedule
        const mockSchedules = [{employee: 'Steve'}, {employee: 'Jane'}];

        // mock the find().sort().toArray() method chain
        const mockToArray = jest.fn().mockResolvedValue(mockSchedules);
        const mockSort = jest.fn().mockReturnValue({ toArray: mockToArray })
        const mockFind = jest.fn().mockReturnValue({ sort: mockSort });

        // mock the mongoose connection succeeding
        const collectionSpy = jest
            .spyOn(mongoose.connection,  'collection')
            .mockReturnValue({ find: mockFind } )

        await edit_schedule_get(req, res);

        expect(collectionSpy).toHaveBeenCalledWith('schedules');
        expect(mockFind).toHaveBeenCalled();
        expect(mockSort).toHaveBeenCalledWith({ employee: 1 });
        expect(mockToArray).toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('admin_edit_schedule', { schedules: mockSchedules,
        });

        collectionSpy.mockRestore();
    });
});

