const express = require("express"),
    router = express.Router();

router.get("/personalization/v1/data/(*)", async (req, res, next) => {
    res.send("Test");
});

module.exports = router;