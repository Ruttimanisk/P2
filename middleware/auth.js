const User = require('../models/user');

exports.requireAuth = async (req, res, next) => {
    const userId = req.cookies.userId;
    const path = req.path.toLowerCase()

    if (!userId) {
        return res.status(401).send('Not logged in');
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).send('User not found');
        }

        if (path.startsWith('/admin') && user.status.toLowerCase() !== 'admin') {
            return res.status(403).send('Access denied: Admins only');
        }

        if (path.startsWith('/employee') && user.status.toLowerCase() !== 'employee') {
            return res.status(403).send('Access denied: Employees only');
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal error');
    }
};

