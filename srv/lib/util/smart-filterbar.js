const HanaClient = require("./hana-client"),
    CommonMethods = require("./common-methods"),
    crypto = require("crypto");

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
        let filterbarContent = await this.#getFilterbarContentFromDB(),
            filterbarOrder = await this.#getFilterbarOrderFromDB(),
            filterbarRanges = await this.#getFilterbarRangesFromDB(),
            filterbarItems = await this.#getFilterbarItemsFromDB(),
            content = {
                version: "V3",
                filterbar: [],
                orderedFilterItems: "{}",
                filterBarVariant: "{}",
                singleInputsTextArrangementData: "{}"
            };

        this.#generateFilterbarContent(content, filterbarContent);
        this.#generateFilterbarOrder(content, filterbarOrder);
        this.#generateFilterbarVariant(content, filterbarRanges, filterbarItems);
        return content;
    }

    async #getFilterbarContentFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("FILTERBAR_CONTENT", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getFilterbarOrderFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("FILTERBAR_ORDER", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getFilterbarRangesFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("FILTERBAR_RANGES", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getFilterbarItemsFromDB() {
        let dbStatement = CommonMethods.generateSelectStatement("FILTERBAR_ITEMS", this.#projectId, this.#fileName, this.#persistencyKey, this.#username, this.#layer);
        return HanaClient.statementExecPromisified(dbStatement);
    }

    #generateFilterbarContent(content, filterbarContent) {
        if (!filterbarContent.length) {
            return;
        }

        content.filterbar = filterbarContent.map((content) => {
            return {
                name: content.FIELD_NAME,
                group: content.FILTER_GROUP,
                partOfCurrentVariant: content.PART_OF_CURRENT_VARIANT,
                visibleInFilterBar: content.VISIBLE_IN_FILTERBAR,
                visible: content.VISIBLE
            };
        });
    }

    #generateFilterbarOrder(content, filterbarOrder) {
        if (!filterbarOrder.length) {
            return;
        }

        content.orderedFilterItems = JSON.stringify(filterbarOrder.map((order) => {
            return {
                name: order.FIELD_NAME,
                group: order.FILTER_GROUP
            };
        }));
    }

    #generateFilterbarVariant(content, filterbarRanges, filterbarItems) {
        if (!filterbarRanges.length && !filterbarItems) {
            return;
        }

        let uniqueFields = new Set([...filterbarRanges.map(range => range.KEY_FIELD), ...filterbarItems.map(item => item.KEY_FIELD)]),
            fbVariant = {};

        for (let field of uniqueFields) {
            let fieldRanges = filterbarRanges.filter(range => range.KEY_FIELD === field),
                fieldItems = filterbarItems.filter(item => item.KEY_FIELD === field);

            fbVariant[field] = { value: null };

            if (fieldRanges.length) {
                if (fieldRanges[0].SINGLE_VALUE) {
                    fbVariant[field] = fieldRanges[0].FIRST_VALUE;
                } else {
                    fbVariant[field].ranges = fieldRanges.map((range) => {
                        let rangeObj = {
                            keyField: range.KEY_FIELD,
                            operation: range.OPERATION,
                            value1: range.FIRST_VALUE,
                            exclude: range.EXCLUDE,
                            tokenText: range.TOKEN_TEXT
                        };

                        if (range.LAST_VALUE !== null) {
                            Object.assign(rangeObj, { value2: range.LAST_VALUE });
                        }

                        return rangeObj;
                    });
                }
            }

            if (fieldItems.length) {
                fbVariant[field].items = fieldItems.map((item) => {
                    return {
                        key: item.KEY_VALUE,
                        text: item.FIELD_TEXT
                    };
                });
            }
        }

        if (fbVariant._BASIC_SEARCH_FIELD) {
            content.basicSearch = fbVariant._BASIC_SEARCH_FIELD;
        }

        content.filterBarVariant = JSON.stringify(fbVariant);
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