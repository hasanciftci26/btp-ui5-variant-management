const HanaClient = require("./hana-client"),
    CommonMethods = require("./common-methods");

class SmartTable {
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
        let tableContent = await this.#getTableContentFromDB(),
            tableSortItems = await this.#getTableSortItemsFromDB(),
            tableFilters = await this.#getTableFiltersFromDB(),
            content = {};

        this.#generateTableContent(content, tableContent);
        this.#generateTableSortItems(content, tableSortItems);
        this.#generateTableFilters(content, tableFilters);
        return content;
    }

    async #getTableContentFromDB() {
        let dbStatement = this.#generateSelectStatement("TABLE_CONTENT");
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getTableSortItemsFromDB() {
        let dbStatement = this.#generateSelectStatement("TABLE_SORT_ITEMS");
        return HanaClient.statementExecPromisified(dbStatement);
    }

    async #getTableFiltersFromDB() {
        let dbStatement = this.#generateSelectStatement("TABLE_FILTERS");
        return HanaClient.statementExecPromisified(dbStatement);
    }

    #generateSelectStatement(tableName) {
        let selectStatement =
            `
                SELECT * FROM "${tableName}"
                WHERE PROJECT_ID      = '${this.#projectId}' AND
                      FILE_NAME       = '${this.#fileName}'  AND
                      PERSISTENCY_KEY = '${this.#persistencyKey}'
            `;

        if (this.#layer === "USER") {
            selectStatement = selectStatement + " AND USER_NAME = '" + this.#username + "'";
        }

        return selectStatement;
    }

    #generateTableContent(content, tableContent) {
        if (!tableContent.length) {
            return;
        }

        Object.assign(content, { columns: {} });

        content.columns.columnsItems = tableContent.map((contentItem) => {
            let columnItem = {
                columnKey: contentItem.COLUMN_KEY
            };

            Object.assign(columnItem, contentItem.COLUMN_INDEX !== null ? { index: contentItem.COLUMN_INDEX } : {});
            Object.assign(columnItem, contentItem.COLUMN_WIDTH !== null ? { width: contentItem.COLUMN_WIDTH } : {});
            Object.assign(columnItem, contentItem.COLUMN_VISIBLE !== null ? { visible: contentItem.COLUMN_VISIBLE } : {});
            return columnItem;
        });
    }

    #generateTableSortItems(content, tableSortItems) {
        if (!tableSortItems.length) {
            return;
        }

        Object.assign(content, { sort: {} });

        content.sort.sortItems = tableSortItems.map((sortItem) => {
            return {
                columnKey: sortItem.COLUMN_KEY,
                operation: sortItem.OPERATION
            };
        });
    }

    #generateTableFilters(content, tableFilters) {
        if (!tableFilters.length) {
            return;
        }

        Object.assign(content, { filter: {} });

        content.filter.filterItems = tableFilters.map((filter) => {
            let filterItem = {
                columnKey: content.COLUMN_KEY,
                operation: content.OPERATION,
                value1: content.FIRST_VALUE,
                exclude: content.EXCLUDE
            };

            Object.assign(filterItem, filter.SECOND_VALUE !== null ? { value2: filter.SECOND_VALUE } : {});
            return filterItem;
        });
    }

    async createTableVariant(variant) {
        await this.#createTableContent(variant);
        await this.#createTableSortItems(variant);
        await this.#createTableFilters(variant);
    }

    async #createTableContent(variant) {
        if (!variant.content.columns) {
            return;
        }

        for (const content of variant.content.columns.columnsItems) {
            let tableContentInsertStatement = CommonMethods.generateInsertStatement("TABLE_CONTENT");

            await HanaClient.statementExecPromisified(tableContentInsertStatement, [
                variant.projectId,
                variant.fileName,
                this.#username,
                variant.selector.persistencyKey,
                content.columnKey,
                content?.index,
                content?.width,
                content?.visible
            ]);
        }
    }

    async #createTableSortItems(variant) {
        if (!variant.content.sort) {
            return;
        }

        for (const content of variant.content.sort.sortItems) {
            let tableSortInsertStatement = CommonMethods.generateInsertStatement("TABLE_SORT_ITEMS");

            await HanaClient.statementExecPromisified(tableSortInsertStatement, [
                variant.projectId,
                variant.fileName,
                this.#username,
                variant.selector.persistencyKey,
                content.columnKey,
                content.operation
            ]);
        }
    }

    async #createTableFilters(variant) {
        if (!variant.content.filter) {
            return;
        }

        for (const content of variant.content.filter.filterItems) {
            let tableFilterInsertStatement = CommonMethods.generateInsertStatement("TABLE_FILTERS");

            await HanaClient.statementExecPromisified(tableFilterInsertStatement, [
                variant.projectId,
                variant.fileName,
                this.#username,
                variant.selector.persistencyKey,
                content.columnKey,
                content.operation,
                content.value1,
                content?.value2,
                content.exclude
            ]);
        }
    }
};

module.exports = SmartTable;