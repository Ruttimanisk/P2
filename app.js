var createError = require('http-errors');
var express = require('express');
var mongoose = require('mongoose')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
const asyncHandler = require("express-async-handler");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var adminRouter = require('./routes/admin');
var employeeRouter = require('./routes/employee');

var app = express();

// ny
app.set('trust proxy', 1); // gør Express klar til at forstå HTTPS bag Nginx


async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected');

    // Setup routes *after* Mongo is ready
    app.use('/', indexRouter);
    app.use('/users', usersRouter);
    app.use('/login', loginRouter);
    app.use('/admin', adminRouter);
    app.use('/employee', employeeRouter);

    app.use('/admin', require('./routes/admin'));

    // Now safe to handle calendar route
    app.get('/calendar', async (req, res) => {
      try {
        const db = mongoose.connection.db;
        const shifts = await db.collection('shifts').find().toArray();

        const events = shifts.map(shift => ({
          title: shift.employee,
          start: `${shift.date}T${shift.start}`,
          end: `${shift.date}T${shift.end}`,
        }));

        res.render('calendar', { events: JSON.stringify(events) });
      } catch (err) {
        console.error('Error loading calendar data:', err);
        res.status(500).send('Error loading calendar');
      }
    });

  } catch (err) {
    console.error('❌ Failed to connect to MongoDB', err);
    process.exit(1); // stop app if DB connection fails
  }

  app.get('/test-mongo', async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      res.json({
        status: 'connected',
        collections: collections.map(c => c.name),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

}

main();


module.exports = { app, mongoose };


