const tableColumns = require("../resources/table-columns.json");

class CommonMethods {
    static generateSelectStatement(tableName, projectId, fileName, persistencyKey, username, layer) {
        let selectStatement =
            `
                SELECT * FROM "${tableName}"
                WHERE PROJECT_ID      = '${projectId}' AND
                      FILE_NAME       = '${fileName}'  AND
                      PERSISTENCY_KEY = '${persistencyKey}'
            `;

        if (layer === "USER") {
            selectStatement = selectStatement + " AND USER_NAME = '" + username + "'";
        }

        return selectStatement;
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

    static getQuestionMarks(count) {
        let index = 0,
            questionMarks = [];

        while (index < count) {
            questionMarks.push("?");
            index++;
        }

        return questionMarks.join();
    }
};

module.exports = CommonMethods;