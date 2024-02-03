const HanaClient = require("./hana-client"),
    CommonMethods = require("./common-methods");

class SmartFilterbar {
    #projectId;
    #fileName;
    #username;
    #persistencyKey;
    #layer;

    constructor(variant, username) {
        this.#projectId = variant.PROJECT_ID || variant.projectId;
        this.#fileName = variant.FILE_NAME || variant.fileName;
        this.#username = username;
        this.#persistencyKey = variant.PERSISTENCY_KEY || variant.selector.persistencyKey;
        this.#layer = variant.LAYER || variant.layer;
    }

    async getContent() {

    }

    async createFilterbarVariant(variant) {
        await this.#createFilterbarContent(variant);
        await this.#createFilterbarOrder(variant);
        await this.#createFilterbarRanges(variant);
        await this.#createFilterbarItems(variant);
    }

    async #createFilterbarContent(variant) {
        if (!variant.content.filterbar) {
            return;
        }

        for (const content of variant.content.filterbar) {
            let filterContentInsertStatement = CommonMethods.generateInsertStatement("FILTERBAR_CONTENT");

            await HanaClient.statementExecPromisified(filterContentInsertStatement, [
                variant.projectId,
                variant.fileName,
                this.#username,
                variant.selector.persistencyKey,
                content.name,
                content.group,
                content.partOfCurrentVariant,
                content.visibleInFilterBar,
                content.visible
            ]);
        }
    }
    async #createFilterbarOrder(variant) {
        if (!variant.content.orderedFilterItems) {
            return;
        }

        let orderedFilters = JSON.parse(variant.content.orderedFilterItems),
            indexedFilters = [];

        orderedFilters.forEach((filter, index) => {
            filter.filterIndex = index;
            indexedFilters.push(filter);
        });

        for (const filter of indexedFilters) {
            let filterOrderInsertStatement = CommonMethods.generateInsertStatement("FILTERBAR_ORDER");

            await HanaClient.statementExecPromisified(filterOrderInsertStatement, [
                variant.projectId,
                variant.fileName,
                this.#username,
                variant.selector.persistencyKey,
                filter.name,
                filter.group,
                filter.filterIndex
            ]);
        }
    }
    async #createFilterbarRanges(variant) {
        if (!variant.content.filterBarVariant) {
            return;
        }

        let filterVariant = JSON.parse(variant.content.filterBarVariant);

        for (let field in filterVariant) {
            let filterRangeInsertStatement = CommonMethods.generateInsertStatement("FILTERBAR_RANGES");

            if (filterVariant[field].ranges) {
                for (let content of filterVariant[field].ranges) {
                    await HanaClient.statementExecPromisified(filterRangeInsertStatement, [
                        variant.projectId,
                        variant.fileName,
                        this.#username,
                        variant.selector.persistencyKey,
                        field,
                        crypto.randomUUID(),
                        content.operation,
                        content.value1,
                        content?.value2,
                        content.exclude,
                        content?.tokenText,
                        false
                    ]);
                }
            } else {
                await HanaClient.statementExecPromisified(filterRangeInsertStatement, [
                    variant.projectId,
                    variant.fileName,
                    this.#username,
                    variant.selector.persistencyKey,
                    field,
                    crypto.randomUUID(),
                    "EQ",
                    filterVariant[field],
                    null,
                    false,
                    null,
                    true
                ]);
            }
        }
    }
    async #createFilterbarItems(variant) {
        if (!variant.content.filterBarVariant) {
            return;
        }

        let filterVariant = JSON.parse(variant.content.filterBarVariant);

        for (let field in filterVariant) {
            if (filterVariant[field].items) {
                let insertedFilters = [];
                for (let content of filterVariant[field].items) {
                    if (insertedFilters.includes(content.key)) {
                        continue;
                    }

                    let filterItemInsertStatement = CommonMethods.generateInsertStatement("FILTERBAR_ITEMS");

                    await HanaClient.statementExecPromisified(filterItemInsertStatement, [
                        variant.projectId,
                        variant.fileName,
                        this.#username,
                        variant.selector.persistencyKey,
                        field,
                        content.key,
                        content.text
                    ]);

                    insertedFilters.push(content.key);
                }
            }
        }
    }
};

module.exports = SmartFilterbar;