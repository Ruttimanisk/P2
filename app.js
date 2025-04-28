var createError = require('http-errors');
var express = require('express');
var mongoose = require('mongoose')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var adminRouter = require('./routes/admin');
var employeeRouter = require('./routes/employee');

var app = express();

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/admin', adminRouter);
app.use('/employee', employeeRouter);

const { ObjectId } = require('mongodb');

app.get('/calendar', async (req, res) => {
  const db = mongoose.connection;
  const collection = db.collection('shifts');
  const shifts = await collection.find().toArray();

  console.log("🔍 Found shifts:", shifts); // ← tilføj denne

  const events = shifts.map(shift => {
    const day = shift.date || "2024-04-08"; // fallback til dummy-dato
    return {
      title: shift.employee || "Ukendt", // fallback
      start: `${date}T${shift.start}`,
      end: `${date}T${shift.end}`,
    };
  });

  console.log("📆 Parsed events:", events); // ← og denne

  res.render('calendar', { events: JSON.stringify(events) });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

