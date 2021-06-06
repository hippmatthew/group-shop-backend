const { Query } = require("./queries");
const { Mutation } = require("./mutations");
const { Subscription } = require("./subscriptions");

module.exports = {
  Query: {
    ...Query,
  },
  Mutation: {
    ...Mutation,
  },
  Subscription: {
    ...Subscription,
  },
};
