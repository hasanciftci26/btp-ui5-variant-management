const HanaClient = require("./hana-client");

class KeyUser {
    #username;
    #settingsStatement;

    constructor(username) {
        this.#username = username;
        this.#settingsStatement =
            `
                SELECT * FROM KEYUSER_SETTINGS
                WHERE LOGON_USER = '${this.#username}'
            `;
    }

    async getSettings() {
        let settings = {};

        try {
            settings = await this.#getSettingsFromDB();
        } catch (error) {
            throw error;
        }

        return settings;
    }

    async #getSettingsFromDB() {
        const settings = await HanaClient.statementExecPromisified(this.#settingsStatement);

        if (!settings.length) {
            throw new Error("No setting was found for the user!");
        }

        return {
            isKeyUser: settings[0].IS_KEY_USER,
            isKeyUserTranslationEnabled: settings[0].IS_KEY_USER_TRANSLATION_ENABLED,
            isProductiveSystem: settings[0].IS_PRODUCTIVE_SYSTEM,
            isVariantSharingEnabled: settings[0].IS_VARIANT_SHARING_ENABLED,
            isVersioningEnabled: settings[0].IS_VERSIONING_ENABLED,
            isVariantAdaptationEnabled: settings[0].IS_VARIANT_ADAPTATION_ENABLE,
            isPublicLayerAvailable: settings[0].IS_PUBLIC_LAYER_AVAILABLE,
            isPublicFlVariantEnabled: settings[0].IS_PUBLIC_FL_VARIANT_ENABLED,
            isPublishAvailable: settings[0].IS_PUBLISH_AVAILABLE,
            logonUser: settings[0].LOGON_USER
        };
    }
};

module.exports = KeyUser;