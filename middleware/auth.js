const User = require('../models/user');
const mongoose = require('mongoose');

exports.requireAuth = async (req, res, next) => {
    const userId = req.cookies.userId;
    const path = req.path.toLowerCase()

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).send('Not logged in or invalid user ID');
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).send('User not found');
        }

        const userStatus = (user.status || '').toLowerCase();

        if (req.baseUrl === '/admin' && userStatus !== 'admin') {
            return res.status(403).send('Access denied: Admins only');
        }

        if (req.baseUrl === '/employee' && userStatus !== 'employee') {
            return res.status(403).send('Access denied: Employees only');
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal error');
    }
};

