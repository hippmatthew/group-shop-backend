const { UserInputError } = require("apollo-server-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../../models/user");
const List = require("../../../models/list");
const authenticate = require("../../../util/authentication");
const { user_validation } = require("../../../util/validation");
const { get_user_index, get_list_index } = require("../../../util/get_index");

const SECRET = process.env.SECRET;

module.exports = {
  register: async (_, { info: { email, password, screen_name } }) => {
    // validation
    const { valid, errors } = await user_validation({
      method: "register",
      email,
      password,
      screen_name,
    });
    if (!valid) throw new UserInputError("Registration Error", { errors });

    // hash the password BEFORE saving to the database
    password = await bcrypt.hash(password, 12);

    // adds the new user to the database
    const user = await new User({
      email,
      password,
      screen_name,
      lists: [],
      join_date: new Date().toISOString(),
    }).save();

    // generate a token for the user
    const token = jwt.sign({ userID: user._id }, SECRET, { noTimestamp: true });

    return {
      token,
      user: {
        id: user._id,
        ...user._doc,
      },
    };
  },
  login: async (_, { email, password }) => {
    // validation
    const { valid, errors, user } = await user_validation({
      method: "login",
      email,
      password,
    });
    if (!valid) throw new UserInputError("Login Error", { errors });

    const token = jwt.sign({ userID: user._id }, SECRET, { noTimestamp: true });

    return {
      token,
      user: {
        id: user._id,
        ...user._doc,
      },
    };
  },
  create_temp_user: async (_, { screen_name }) => {
    // validation
    const { valid, errors } = await user_validation({
      method: "register",
      screen_name,
    });
    if (!valid) throw new UserInputError("Temp Creation Error", { errors });

    // adds the temp user to the database
    const user = await new User({
      email: null,
      password: null,
      screen_name,
      lists: [],
      join_date: "temp",
    }).save();

    const token = jwt.sign({ userID: user._id }, SECRET, { noTimestamp: true });

    return {
      token,
      user: {
        id: user._id,
        ...user._doc,
      },
    };
  },
  upgrade_temp_user: async (_, { email, password }, { req }) => {
    const { userID } = authenticate(req);
    const user = User.findById(userID);

    const { valid, errors } = await user_validation({
      method: "update",
      email,
      password,
    });
    if (!valid) throw new UserInputError("Upgrade Error", { errors });

    user.email = email;
    user.password = password;
    user.join_date = new Date().toISOString();
    const updated_user = user.save();

    const token = jwt.sign({ userID: user._id }, SECRET, { noTimestamp: true });

    return {
      token,
      user: {
        id: updated_user._id,
        ...updated_user._doc,
      },
    };
  },
  delete_user: async (_, __, { req, pubsub }) => {
    /*
     * 1) DELETE THE USER
     * 2) Seperate the owned and unowned lists
     * 3) For every user in the owned lists, remove the list from the user's list array *exluding the owner*
     * 4) For every list in the unowned lists, remove the user from the list members array and send an update
     */

    const { userID } = authenticate(req);

    try {
      const deleted_user = await User.findByIdAndDelete(userID);

      // seperates the deleted user's lists into owned and unowned
      const owned_lists = [];
      const unowned_lists = [];

      for (let i = 0; i < deleted_user.lists.length; i++) {
        if (deleted_user.lists[i].owned)
          owned_lists.push(deleted_user.lists[i]);
        else unowned_lists.push(deleted_user.lists[i]);
      }

      owned_lists.forEach(async (user_list) => {
        const list = await List.findById(user_list._id);

        /* 
           1. remove the deleted user from the list
           2. delete the list if there are no more members
           3. if there are members, update ownership
           4. pubsub
        */

        // removes the user at the specified index
        const user_index = get_user_index(list, deleted_user._id);
        list.members.splice(user_index, 1);

        // deletes the list if there are no more members
        if (list.members.length == 0)
          var deleted_list = await List.findByIdAndDelete(list._id);

        if (!deleted_list) {
          // updates list ownership
          var new_owner = await User.findById(list.members[0]._id);

          list.owner = new_owner._id;

          // gets the index of the list in the new owner's list array
          const owner_list_index = get_list_index(new_owner, list._id);

          // updates the owned status in the new owner's list and overwrites the user in the database
          new_owner.lists[owner_list_index].owned = true;
          new_owner = await new_owner.save();

          const updated_list = await list.save();

          // updates the list members for each member in the list
          updated_list.members.forEach(async (member) => {
            const user = await User.findById(member._id);

            const list_index = get_list_index(user, updated_list._id);
            user.lists[list_index].members = updated_list.members;

            await user.save();
          });

          // sends an update to all the users in the list that the deleted user has left
          pubsub.publish(updated_list._id, {
            member_updates: {
              type: "leave",
              affector: {
                id: deleted_user._id,
                screen_name: deleted_user.screen_name,
              },
              member: {
                id: deleted_user._id,
                screen_name: deleted_user.screen_name,
              },
            },
          });

          // sends an update to all the users in the list that the owner has changed
          pubsub.publish(updated_list._id, {
            member_updates: {
              type: "owner change",
              affector: {
                id: deleted_user._id,
                screen_name: deleted_user.screen_name,
              },
              member: {
                id: new_owner._id,
                screen_name: new_owner.screen_name,
              },
            },
          });
        }
      });

      // For every unowned list, removes the deleted user from that list
      unowned_lists.forEach(async (user_list) => {
        const list = await List.findById(user_list._id);

        // removes the deleted user from the list
        const user_index = get_user_index(list, deleted_user._id);
        list.members.splice(user_index, 1);

        // overwrites the list in the database
        const updated_list = await list.save();

        // updates the list members
        updated_list.members.forEach(async (member) => {
          const user = await User.findById(member._id);

          const list_index = get_list_index(user, updated_list._id);
          user.lists[list_index].members = updated_list.members;

          await user.save();
        });

        // sends an update to all users in the list that the deleted user has left
        pubsub.publish(updated_list._id, {
          member_updates: {
            type: "leave",
            affector: {
              id: deleted_user._id,
              screen_name: deleted_user.screen_name,
            },
            member: {
              id: deleted_user._id,
              screen_name: deleted_user.screen_name,
            },
          },
        });
      });

      return {
        id: deleted_user._id,
        ...deleted_user._doc,
      };
    } catch (err) {
      throw new Error("Account Deletion Error", err);
    }
  },
  generate_new_token: async (_, __, { req }) => {
    try {
      const userID = authenticate(req);
      const user = await User.findById(userID);

      const token = jwt.sign({ userID: user._id }, SECRET, {
        noTimestamp: true,
      });

      return {
        token,
        user: {
          id: user._id,
          ...user._doc,
        },
      };
    } catch (err) {
      throw new Error(err);
    }
  },
  update_user: async (
    _,
    { screen_name = null, email = null, password = null },
    { req }
  ) => {
    const { userID } = authenticate(req);
    const user = await User.findById(userID);

    const { valid, errors } = await validate({
      screen_name,
      email,
      password,
      method: "update",
    });
    if (!valid) throw new UserInputError("User Update Error", { errors });

    if (screen_name != null) {
      user.screen_name = screen_name;

      user.lists.forEach(async (user_list) => {
        const list = await List.findById(user_list._id);

        const user_index = get_user_index(list, user._id);
        list.members[user_index].screen_name = user.screen_name;

        await list.save();
      });
    }

    if (email != null) user.email = email;

    if (password != null) {
      password = await bcrypt.hash(password, 12);
      user.password = password;
    }

    const updated_user = await user.save();

    return {
      id: updated_user._id,
      ...updated_user._doc,
    };
  },
};
