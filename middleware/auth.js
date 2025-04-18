// tilføj check for user status, afhængig af path. fx /admin/ eller /employee/

const User = require('../models/user');

exports.requireAuth = async (req, res, next) => {
    const userId = req.cookies.userId;

    if (!userId) {
        return res.status(401).send('Not logged in');
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).send('User not found');
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal error');
    }
};
