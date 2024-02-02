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
};

module.exports = CommonMethods;