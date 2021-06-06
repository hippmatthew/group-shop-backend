const User = require("../../models/user");
const List = require("../../models/list");
const { get_user_index, get_list_index } = require("../get_index");

module.exports = async ({
  listID = null,
  userID = null,
  list_name = null,
  code = null,
  ownerID = null,
  method = "no-user-check",
}) => {
  const errors = {};

  // the list name must not be empty
  if (list_name != null)
    if (list_name.trim() === "")
      errors.list_name = "List name must not be empty";

  // the user ID must not be empty and must exist in the database
  if (userID != null) {
    if (userID === "") errors.userID = "User id must not be empty";
    else {
      var user = await User.findById(userID);
      if (!user) errors.userID = "User with that id not found";
    }
  }

  // the code must not be empty and a list with this code must exist in the database
  if (code != null) {
    if (code.trim() === "") errors.code = "Code must not be empty";
    else {
      var list = await List.findOne({ code });
      if (!list) errors.code = "List not found";
    }
  }

  // the list ID must not be empty and must exist in the database
  if (listID != null) {
    if (listID === "") errors.listID = "List ID must not be empty";
    else {
      var list = await List.findById(listID);
      if (!list) errors.listID = "List with that ID not found";
    }
  }

  if (ownerID != null) {
    if (ownerID === "") errors.ownerID = "Owner ID must not be empty";
    else {
      var owner = await User.findById(ownerID);
      if (!owner) errors.ownerID = "Owner with that ID not found";
    }
  }

  // the method can only be 'no-user-check', 'user-join', or 'user-leave'. Anything else is invalid
  switch (method) {
    case "no-user-check":
      // returns early since there is no required check on the user
      return {
        valid: Object.keys(errors).length < 1,
        errors,
        list: list ? list : null,
        user: user ? user : null,
      };
    case "user-join":
      // the user must not exist in the list
      if (!list) break;

      var user_index = get_user_index(list, userID);
      if (user_index != -1)
        errors.userID = "User is already a part of this list";
      break;
    case "user-leave":
      if (!list) break;

      // the user must exist in the list
      var user_index = get_user_index(list, userID);
      if (user_index == -1) errors.userID = "User is not a part of the list";

      // the list must exist in the user
      var list_index = get_list_index(user, listID);
      if (list_index == -1)
        errors.listID = "List not found in user's list array";

      break;
    case "update-list":
      if (!list) break;

      if (user) {
        var user_index = get_user_index(list, userID);
        if (user_index == -1) errors.userID = "User is not a part of the list";
      }

      if (owner) {
        var owner_index = get_user_index(list, ownerID);
        if (owner_index == -1) errors.userID = "User is not a part of the list";
      }
    default:
      errors.method = "Invalid method";
  }

  return {
    valid: Object.keys(errors).length < 1,
    errors,
    list: list ? list : null,
    user: user ? user : null,
    owner: owner ? owner : null,
    user_index: user_index != -1 ? user_index : null,
    owner_index: owner_index != -1 ? owner_index : null,
    list_index: list_index != -1 ? list_index : null,
  };
};
