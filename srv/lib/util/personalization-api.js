const KeyUser = require("./keyuser"),
    HanaClient = require("./hana-client"),
    SmartTable = require("./smart-table"),
    SmartFilterbar = require("./smart-filterbar"),
    tableColumns = require("../resources/table-columns.json"),
    CommonMethods = require("./common-methods");

class PersonalizationAPI {
    #username;
    #projectId;
    #layer;

    constructor(projectId, username, layer) {
        this.#projectId = projectId;
        this.#username = username;
        this.#layer = layer;
    }

    async getKeyUserSettings() {
        let keyuser = new KeyUser(this.#username),
            keyuserSettings = {};

        try {
            keyuserSettings = await keyuser.getSettings();
        } catch (error) {
            throw error;
        }

        return keyuserSettings;
    }

    async getPersonalizationData() {
        let componentVariants = await this.#getComponentVariants(),
            changes = await this.#getChanges();

        return {
            changes: changes,
            compVariants: componentVariants,
            variantDependentControlChanges: [],
            variantChanges: [],
            variants: [],
            variantManagementChanges: []
        };
    }

    async #getComponentVariants() {
        let componentVariants = await this.#getCompVariantsFromDB(),
            compVariants = [];

        for (const variant of componentVariants) {
            let content = await this.#getContent(variant);

            let compVariantItem = {
                changeType: variant.CHANGE_TYPE,
                reference: variant.PROJECT_ID,
                namespace: `apps/${variant.PROJECT_ID}/changes/`,
                projectId: variant.PROJECT_ID,
                support: {
                    generator: variant.GENERATOR,
                    user: variant.USER_NAME,
                    sapui5Version: variant.SAPUI5_VERSION
                },
                originalLanguage: variant.ORIGINAL_LANGUAGE,
                layer: variant.LAYER,
                fileType: variant.FILE_TYPE,
                fileName: variant.FILE_NAME,
                content: content,
                texts: {
                    variantName: {
                        value: variant.VARIANT_NAME,
                        type: variant.VARIANT_TYPE
                    }
                },
                favorite: variant.FAVORITE,
                executeOnSelection: variant.EXECUTE_ON_SELECTION,
                contexts: {},
                selector: {
                    persistencyKey: variant.PERSISTENCY_KEY
                },
                standardVariant: variant.STANDARD_VARIANT,
                variantId: variant.FILE_NAME,
                creation: variant.CREATION
            };

            compVariants.push(compVariantItem);
        }

        return compVariants;
    }

    async #getChanges() {
        return [];
    }

    async #getCompVariantsFromDB() {
        let dbStatement =
            `
                SELECT * FROM COMPONENT_VARIANTS
                WHERE PROJECT_ID = '${this.#projectId}' AND
                      LAYER      = '${this.#layer}'     AND
                      CHANGE_TYPE NOT IN ('defaultVariant','updateVariant')
            `;

        if (this.#layer === "USER") {
            dbStatement = dbStatement + " AND USER_NAME = '" + this.#username + "'";
        }

        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getContent(variant) {
        let content = {};

        switch (variant.CHANGE_TYPE) {
            case "table":
                let smartTable = new SmartTable(variant, this.#username);
                content = await smartTable.getContent();
                break;
            case "filterBar":
                let smartFilterbar = new SmartFilterbar(variant, this.#username);
                content = await smartFilterbar.getContent();
                break;
        }

        return content;
    }

    async createPersonalizationData(personalizationData) {
        let componentVariant = await this.#createComponentVariant(personalizationData);
        return componentVariant;
    }

    async #createComponentVariant(variant) {
        let compInsertStatement = await this.#generateCompInsertStatement(variant);
        await HanaClient.statementExecPromisified(compInsertStatement.statement, compInsertStatement.params);

        switch (variant.changeType) {
            case "table":
                let smartTable = new SmartTable(variant, this.#username);
                await smartTable.createTableVariant(variant);
                break;
            case "filterBar":
                let smartFilterbar = new SmartFilterbar(variant, this.#username);
                await smartFilterbar.createFilterbarVariant(variant);                
                break;
        }

        return variant;
    }

    async #generateCompInsertStatement(variant) {
        let utcTimeStamp = await HanaClient.statementExecPromisified(`SELECT CURRENT_UTCTIMESTAMP FROM DUMMY`),
            currentTimeStamp = utcTimeStamp[0]["CURRENT_UTCTIMESTAMP"],
            changeTypeFields = this.#getChangeTypeSpecificFields(variant),
            columns = tableColumns.COMPONENT_VARIANTS.join(),
            questionMarks = CommonMethods.getQuestionMarks(tableColumns.COMPONENT_VARIANTS.length);

        let variantInsertParams = [
            variant.projectId,
            variant.fileName,
            this.#username,
            variant.selector.persistencyKey,
            variant.support?.generator,
            variant.originalLanguage,
            variant.layer,
            variant.fileType,
            changeTypeFields.variantName,
            changeTypeFields.variantType,
            changeTypeFields.favorite,
            changeTypeFields.executeOnSelection,
            changeTypeFields.standardVariant,
            variant.changeType,
            variant.support.sapui5Version,
            currentTimeStamp,
            changeTypeFields.defaultVariantName,
            changeTypeFields.packageName,
            changeTypeFields.variantId
        ];

        let variantInsertStatement =
            `
                INSERT INTO "COMPONENT_VARIANTS" 
                (
                    ${columns}
                ) 
                VALUES 
                (
                    ${questionMarks}
                )
            `;

        variant.creation = currentTimeStamp;
        variant.support.user = this.#username;
        return {
            statement: variantInsertStatement,
            params: variantInsertParams
        };
    }

    #getChangeTypeSpecificFields(variant) {
        let fields = {
            variantName: null,
            variantType: null,
            favorite: false,
            executeOnSelection: false,
            standardVariant: false,
            defaultVariantName: null,
            packageName: null,
            variantId: null
        };

        switch (variant.changeType) {
            case "defaultVariant":
                fields.defaultVariantName = variant.content.defaultVariantName;
                break;
            case "updateVariant":
                fields.favorite = variant.content.favorite || false;
                fields.executeOnSelection = variant.content.executeOnSelection || false;
                fields.packageName = variant.packageName;
                fields.variantId = variant.selector.variantId;
                break;
            default:
                fields.variantName = variant.texts.variantName.value;
                fields.variantType = variant.texts.variantName.type;
                fields.favorite = variant.favorite;
                fields.executeOnSelection = variant.executeOnSelection;
                fields.standardVariant = variant.standardVariant;
                break;
        }

        return fields;
    }
}

module.exports = PersonalizationAPI;