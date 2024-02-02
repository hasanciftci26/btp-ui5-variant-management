class SmartFilterbar {
    #projectId;
    #fileName;
    #username;
    #persistencyKey;

    constructor(variant) {
        this.#projectId = variant.PROJECT_ID;
        this.#fileName = variant.FILE_NAME;
        this.#username = variant.USER_NAME;
        this.#persistencyKey = variant.PERSISTENCY_KEY;
    }

    async getContent() {
        
    }
};

module.exports = SmartFilterbar;