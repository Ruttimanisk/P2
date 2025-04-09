const express = require('express');
const router = express.Router();

const user_controller = require('../controllers/user_controller');

router.get("/", user_controller.login)

router.post(
    '/login',
    [
        body('username')
            .trim()
            .notEmpty().withMessage('Username is required')
            .isLength({ max: 50 }).withMessage('Username too long'),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ max: 50 }).withMessage('Password too long'),
    ],
    user_controller.login
);



module.exports = router;