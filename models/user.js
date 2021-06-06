const { model, Schema } = require("mongoose");

const USER_SCHEMA = new Schema({
  email: String,
  password: String,
  screen_name: String,
  lists: [
    {
      list_name: String,
      owned: Boolean,
      members: [
        {
          screen_name: String,
        },
      ],
      last_modified: String,
    },
  ],
  join_date: String,
});

module.exports = model("users", USER_SCHEMA);
