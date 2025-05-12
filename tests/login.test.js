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
        const mockSchedules = [{employee: 'Steve', week_start_date: '2025-05-12'},
                                                        {employee: 'Jane', week_start_date: '2025-05-12'}];

        // mock the find().sort().toArray() method chain
        const mockToArray = jest.fn().mockResolvedValue(mockSchedules);
        const mockSort = jest.fn().mockReturnValue({ toArray: mockToArray })
        const mockFind = jest.fn().mockReturnValue({ sort: mockSort });

        // mock the mongoose connection succeeding
        const collectionSpy = jest
            .spyOn(mongoose.connection,  'collection')
            .mockReturnValue({ find: mockFind } );

        req.query = {};

        await edit_schedule_get(req, res);

        expect(collectionSpy).toHaveBeenCalledWith('schedules');
        expect(mockFind).toHaveBeenCalled();
        expect(mockSort).toHaveBeenCalledWith({ week_start_date: 1, employee: 1 });
        expect(mockToArray).toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('admin_edit_schedule', { schedules: mockSchedules,
                                                                                schedulesByWeek: expect.any(Array),
                                                                                weekIndex: 0,
                                                                                weekNumber: expect.any(Number)});

        collectionSpy.mockRestore();
    });

    test('updates shifts and schedule from posted data', async () => {
        const mockSchedules = [{ _id: 1, employee: 'Steve', week_start_date: '2025-05-12'}];
        // mock the find().sort().toArray() method chain
        const mockToArray = jest.fn().mockResolvedValue(mockSchedules);
        const mockSort = jest.fn().mockReturnValue({ toArray: mockToArray })
        const mockFind = jest.fn().mockReturnValue({ sort: mockSort });

        // check if 'updateOne' is called
        const updateOneMock = jest.fn()

        // mock the mongoose connection succeeding
        const originalCollection = mongoose.connection.collection;
        mongoose.connection.collection = (name) => {
            if(name === 'schedules') {
                return { find: mockFind, updateOne: updateOneMock }}
            if(name === 'shifts') {
                return { updateOne: updateOneMock };
            }
        };

        const req = {
            body: {
                'Steve_Monday_start': '09:00',
                'Steve_Monday_end': '17:00',
                'Steve_Tuesday_start': '10:00',
                'Steve_Tuesday_end': '18:00',
                'Steve_Wednesday_start': '',
                'Steve_Wednesday_end': '',
                'Steve_Thursday_start': '08:00',
                'Steve_Thursday_end': '16:00',
                'Steve_Friday_start': '09:30',
                'Steve_Friday_end': '17:30',
            },
            query: {},
        };

        await edit_schedule_post(req, res);

        expect(updateOneMock).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/admin/calendar');


        mongoose.connection.collection = originalCollection;
    });

    test('render schedule', async () => {

    });
});