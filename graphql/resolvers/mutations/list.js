const { UserInputError } = require("apollo-server-errors");

const List = require("../../../models/list");
const User = require("../../../models/user");
const { list_validation } = require("../../../util/validation");
const generate_code = require("../../../util/code_generator");
const {
  get_list_index,
  get_last_owned_index,
} = require("../../../util/get_index");

module.exports = {
  create_list: async (_, { list_name, userID }) => {
    // validation
    const { valid, errors, user } = await list_validation({
      list_name,
      userID,
    });
    if (!valid) throw new UserInputError("List Creation Error", { errors });

    // generates a unique 5 character code
    do {
      var code = generate_code();
      var invalid = await List.findOne({ code });
    } while (invalid);

    const date = new Date().toISOString();

    // creates a new list and saves it to the database
    const list = await new List({
      owner: user._id,
      list_name,
      code,
      members: [
        {
          _id: user._id,
          screen_name: user.screen_name,
        },
      ],
      items: [],
      created: date,
      last_modified: date,
    }).save();

    const last_owned_index = get_last_owned_index(user);

    // adds the created list to the user's lists and overwrites the user in the database
    user.lists.splice(last_owned_index, 0, {
      _id: list._id,
      list_name: list.list_name,
      owned: true,
      members: list.members,
      last_modified: date,
    });
    await user.save();

    return {
      id: list._id,
      ...list._doc,
    };
  },
  join_list: async (_, { code, userID }, { pubsub }) => {
    // validation
    const { errors, valid, list, user } = await list_validation({
      code,
      userID,
      method: "user-join",
    });
    if (!valid) throw new UserInputError("List Join Error", { errors });

    // adds the user to the list of members adn overwrites the list in the database
    list.members.push({
      _id: user._id,
      screen_name: user.screen_name,
    });
    const updated_list = await list.save();

    // adds the joined list to the user's lists and overwrites the user in the database
    user.lists.push({
      _id: updated_list._id,
      list_name: updated_list.list_name,
      owned: false,
      members: updated_list.members,
      last_modified: updated_list.last_modified,
    });
    const updated_user = await user.save();

    // updates the members in each user's list array
    updated_list.members.forEach(async (member) => {
      try {
        const list_user = await User.findById(member._id);

        if (
          list_user._id.toString().localeCompare(updated_user._id.toString()) !=
          0
        ) {
          const list_index = get_list_index(list_user, updated_list._id);
          list_user.lists[list_index].members = updated_list.members;

          await list_user.save();
        }
      } catch (err) {
        throw new Error("Error updating list array: ", err);
      }
    });

    // sends an update to everyone in the list containing the user that just joined
    pubsub.publish(updated_list._id, {
      member_updates: {
        type: "join",
        affector: {
          id: updated_user._id,
          screen_name: updated_user.screen_name,
        },
        member: {
          id: updated_list.members[updated_list.members.length - 1]._id,
          screen_name:
            updated_list.members[updated_list.members.length - 1].screen_name,
        },
      },
    });

    return {
      id: updated_list._id,
      ...updated_list._doc,
    };
  },
  leave_list: async (_, { listID, userID }, { pubsub }) => {
    // validation
    const { valid, errors, list, user, user_index, list_index } =
      await list_validation({
        listID,
        userID,
        method: "user-leave",
      });
    if (!valid) throw new UserInputError("Leave Error", { errors });

    // removes the user at the specified index
    list.members.splice(user_index, 1);

    // removes the list from the user's list array and overwrites the user in the database
    user.lists.splice(list_index, 1);
    const updated_user = await user.save();

    // if there are no more users in the list, deletes the list
    if (list.members.length == 0) {
      const deleted_list = await List.findByIdAndDelete(listID);

      return {
        id: deleted_list._id,
        ...deleted_list._doc,
      };
    }

    // if the owner left, updates the owner
    if (
      updated_user._id.toString().localeCompare(list.owner.toString()) === 0
    ) {
      // finds the next owner of the list
      var new_owner = await User.findById(list.members[0]._id);
      if (!new_owner) throw new Error("Owner Change Error: ID not found");

      // updates the list's owner
      list.owner = new_owner._id;

      // gets the index of the list in the new owner's list array
      const owner_list_index = get_list_index(new_owner, listID);
      if (owner_list_index == -1)
        throw new Error(
          "Owner Change Error: List not found in user's list array"
        );

      // updates the owned status in the new owner's list and overwrites the user in the database
      new_owner.lists[owner_list_index].owned = true;
      new_owner = await new_owner.save();
    }

    // overwrites the list in the database
    const updated_list = await list.save();

    // updates the list members for each member in the list
    updated_list.members.forEach(async (member) => {
      const user = await User.findById(member._id);

      const list_index = get_list_index(user, updated_list._id);
      user.lists[list_index].members = updated_list.members;

      await user.save();
    });

    // sends an update to everyone in the list containing the user that left
    pubsub.publish(updated_list._id, {
      member_updates: {
        type: "leave",
        affector: {
          id: updated_user._id,
          screen_name: updated_user.screen_name,
        },
        member: {
          id: updated_user._id,
          screen_name: updated_user.screen_name,
        },
      },
    });

    // if the owner changed, sends an update to everyone in the list containing the new owner
    if (updated_list.owner != updated_user._id) {
      pubsub.publish(updated_list._id, {
        member_updates: {
          type: "owner change",
          affector: {
            id: updated_user._id,
            screen_name: updated_user.screen_name,
          },
          member: {
            id: new_owner._id,
            screen_name: new_owner.screen_name,
          },
        },
      });
    }

    return {
      id: updated_list._id,
      ...updated_list._doc,
    };
  },
  delete_list: async (_, { listID }) => {
    try {
      const deleted_list = await List.findByIdAndDelete(listID);

      // for every user in the list - finds the index in their list array, removes it, then overwrites the user in the database
      deleted_list.members.forEach(async (member) => {
        const user = await User.findById(member._id);

        const list_index = get_list_index(user, deleted_list._id);
        user.lists.splice(list_index, 1);

        await user.save();
      });

      return {
        id: deleted_list._id,
        ...deleted_list._doc,
      };
    } catch (err) {
      throw new Error("List Deletion Error", err);
    }
  },
  update_list: async (
    _,
    {
      listID,
      userID,
      ownerID = null,
      list_name = null,
      generate_new_code = false,
    },
    { pubsub }
  ) => {
    const { valid, errors, list, user, owner } = list_validation({
      listID,
      userID,
      list_name,
      ownerID,
      method: "list-update",
    });
    if (!valid) throw new UserInputError("List Update Error", { errors });

    if (list_name != null) list.list_name = list_name;

    if (owner != null) list.owner = owner._id;

    if (generate_new_code) {
      do {
        var code = generate_code();
        var invalid = await List.findOne({ code });
      } while (invalid);
      list.code = code;
    }

    const updated_list = await list.save();

    pubsub.publish(updated_list._id, {
      list_updates: {
        type: "list-update",
        affector: {
          id: user._id,
          screen_name: user.screen_name,
        },
        properties: {
          owner: owner != null ? updated_list.owner : null,
          list_name: list_name != null ? updated_list.list_name : null,
          code: generate_new_code ? updated_list.code : null,
        },
      },
    });

    return {
      id: updated_list._id,
      ...updated_list._doc,
    };
  },
};
