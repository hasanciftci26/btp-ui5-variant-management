const HanaClient = require("./hana-client"),
    xsenv = require("@sap/xsenv"),
    keyuserSettings = require("../resources/keyuser-settings.json");

class KeyUser {
    #username;

    constructor(username) {
        this.#username = username;
    }

    getSettings(req) {
        let settings = {},
            xsuaaInstance = xsenv.getServices({
                uaa: {
                    tag: "xsuaa"
                }
            }).uaa;

        if(req.authInfo.checkScope(xsuaaInstance.xsappname + ".Admin")) {
            settings = keyuserSettings.Admin;
        } else if (req.authInfo.checkScope(xsuaaInstance.xsappname + ".PublicViewManager")){
            settings = keyuserSettings.PublicViewManager;
        } else {
            settings = keyuserSettings.RegularUser;
        }

        settings.logonUser = this.#username;
        return settings;
    }
};

module.exports = KeyUser;