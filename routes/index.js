var express = require('express');
var router = express.Router();

/* GET home page. */
console.log('jeg kører')
router.get("/", function (req, res) {
  res.redirect("/login");
});
module.exports = router;
