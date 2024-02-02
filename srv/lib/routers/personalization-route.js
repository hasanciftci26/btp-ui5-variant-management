const express = require("express"),
    router = express.Router(),
    PersonalizationAPI = require("../util/personalization-api");

router.head("/personalization/v1/actions/getcsrftoken", (req, res, next) => {
    res.set("X-CSRF-Token", "4ba7ac47ac735bd5-wwQTNsqYV2tTktOM3NHEp9b4N5M");
    res.status(200).end();
});

router.get("/personalization/v1/data/:projectId", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.params.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.getPersonalizationData();

    res.json(personalizationData);
});

router.post("/personalization/v1/changes/", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.body.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.createPersonalizationData(req.body[0]);

    res.json(personalizationData);
});

router.get("/keyuser/v2/settings", async (req, res, next) => {
    let personalization = new PersonalizationAPI(null, req.authInfo.getLogonName(), null);
    keyuserSettings = {};

    try {
        keyuserSettings = await personalization.getKeyUserSettings();
        res.json(keyuserSettings);
    } catch (error) {
        res.status(404).send(error.message);
    }
});

module.exports = router;