const user = require("./user");
const list = require("./list");
const item = require("./item");

module.exports = {
  Mutation: {
    ...user,
    ...list,
    ...item,
  },
};
