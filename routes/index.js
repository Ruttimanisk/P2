var express = require('express');
var router = express.Router();

/* GET home page. */
router.get("/qwe", function (req, res) {
  res.redirect("/login");
});
module.exports = router;
