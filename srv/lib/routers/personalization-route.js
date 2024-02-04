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

router.put("/personalization/v1/changes/:fileName", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.body.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.updatePersonalizationData(req.body);

    res.json(personalizationData);
});

router.post("/personalization/v1/changes/", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.body.projectId, req.authInfo.getLogonName(), "USER"),
        personalizationData = await personalization.createPersonalizationData(req.body[0]);

    res.json(personalizationData);
});

router.delete("/personalization/v1/changes/:fileName", async (req, res, next) => {
    let personalization = new PersonalizationAPI(req.query.namespace.split("/")[1], req.authInfo.getLogonName(), "USER");
    await personalization.deletePersonalizationData(req.params.fileName);
    res.sendStatus(204);
});

router.get("/keyuser/v2/settings", async (req, res, next) => {
    let personalization = new PersonalizationAPI(null, req.authInfo.getLogonName(), null),
        keyuserSettings = personalization.getKeyUserSettings(req);

    res.json(keyuserSettings);
});

module.exports = router;