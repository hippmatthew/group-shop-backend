const list = require("../../models/list");
const List = require("../../models/list");
const User = require("../../models/user");

module.exports = {
  Query: {
    get_list: async (_, { listID }) => {
      try {
        const list = await List.findById(listID);
        return {
          id: list._id,
          ...list._doc,
        };
      } catch (err) {
        throw new Error("List Retrieval Error", err);
      }
    },
    get_user_lists: async (_, { userID }) => {
      try {
        const { lists } = await User.findById(userID);
        return lists;
      } catch (err) {
        throw new Error("List Retrieval Error", err);
      }
    },
    get_every_user: async () => {
      try {
        const users = await User.find();
        return users;
      } catch (err) {
        throw new Error("Every User Query Error", err);
      }
    },
    get_user: async (_, { userID }) => {
      try {
        const user = await User.findById(userID);

        return {
          id: user._id,
          ...user._doc,
        };
      } catch (err) {
        throw new Error("User Query Error", err);
      }
    },
  },
};
