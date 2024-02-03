const tableColumns = require("../resources/table-columns.json");

class CommonMethods {
    static getQuestionMarks(count) {
        let index = 0,
            questionMarks = [];

        while (index < count) {
            questionMarks.push("?");
            index++;
        }

        return questionMarks.join();
    }

    static generateInsertStatement(tableName) {
        let columns = tableColumns[tableName],
            questionMarks = this.getQuestionMarks(tableColumns[tableName].length);

        let insertStatement =
            `
                INSERT INTO "${tableName}" 
                (
                    ${columns}
                ) 
                VALUES 
                (
                    ${questionMarks}
                )
            `;

        return insertStatement;
    }
};

module.exports = CommonMethods;