const HanaClient = require("./hana-client");

class SmartTable {
    #projectId;
    #fileName;
    #username;
    #persistencyKey;
    #layer;

    constructor(variant) {
        this.#projectId = variant.PROJECT_ID;
        this.#fileName = variant.FILE_NAME;
        this.#username = variant.USER_NAME;
        this.#persistencyKey = variant.PERSISTENCY_KEY;
        this.#layer = variant.LAYER;
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
                SELECT * FROM ${tableName}
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

        content.columns.columnItems = tableContent.map((contentItem) => {
            let columnItem = {
                columnKey: contentItem.COLUMN_KEY
            };

            Object.assign(columnItem, contentItem.INDEX === null ? { index: contentItem.INDEX } : {});
            Object.assign(columnItem, contentItem.WIDTH === null ? { width: contentItem.WIDTH } : {});
            Object.assign(columnItem, contentItem.VISIBLE === null ? { visible: contentItem.VISIBLE } : {});
            return columnItem;
        });
    }

    #generateTableSortItems(content, tableSortItems) {
        if (!tableSortItems.length) {
            return;
        }

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

        content.filter.filterItems = tableFilters.map((filter) => {
            let filterItem = {
                columnKey: content.COLUMN_KEY,
                operation: content.OPERATION,
                value1: content.FIRST_VALUE,
                exclude: content.EXCLUDE
            };

            Object.assign(filterItem, filter.SECOND_VALUE === null ? { value2: filter.SECOND_VALUE } : {});
            return filterItem;
        });
    }
};

module.exports = SmartTable;