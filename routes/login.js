const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const user_controller = require('../controllers/user_controller');

router.get('/', (req, res) => {
    res.render('login');
});

router.post(
    '/',
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