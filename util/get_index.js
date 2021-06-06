module.exports = {
  get_item_index: (list, itemID) => {
    // goes through the entire item array and tries to find the index of the item ID
    let index = -1;
    for (let i = 0; i < list.items.length; i++) {
      if (list.items[i]._id.toString().localeCompare(itemID.toString()) === 0) {
        index = i;
        break;
      }
    }
    return index;
  },
  get_user_index: (list, userID) => {
    // goes through the entire members array and tries to find the index of the user ID
    let index = -1;
    for (let i = 0; i < list.members.length; i++) {
      if (
        list.members[i]._id.toString().localeCompare(userID.toString()) === 0
      ) {
        index = i;
        break;
      }
    }
    return index;
  },
  get_list_index: (user, listID) => {
    let index = -1;
    for (let i = 0; i < user.lists.length; i++) {
      if (user.lists[i]._id.toString().localeCompare(listID.toString()) === 0) {
        index = i;
        break;
      }
    }
    return index;
  },
  get_last_owned_index: (user) => {
    let index = 0;
    for (let i = 0; i < user.lists.length; i++) {
      if (user.lists[i].owned == true) index = i + 1;
      else break;
    }
    return index;
  },
};
