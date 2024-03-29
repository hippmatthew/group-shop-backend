const bcrypt = require("bcryptjs");

const User = require("../../models/user");

const email_regEx =
  /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;

module.exports = async ({
  method = null,
  email = null,
  password = null,
  screen_name = null,
}) => {
  const errors = {};

  // the method must be 'login' or 'register' or else the validation won't work
  let can_continue = false;
  switch (method) {
    case "register":
    case "update":
    case "login":
      can_continue = true;
      break;
    default:
      errors.method = "Invalid method";
  }

  // email must not be empty, must be valid, and must exists in the database
  if (email != null && can_continue) {
    if (email.trim() === "") errors.email = "Email must not be empty";
    else if (!email.match(email_regEx)) errors.email = "Must be a valid email";
    else {
      var user = await User.findOne({ email });
      if (method == "register" && user)
        errors.email = "There is already a user with that email";
      else if (method == "login" && !user) errors.email = "User does not exist";
      else if (method == "update" && user) errors.email = "User already exists";
    }
  }

  // password must not be empty, greater than or equal to 8 characters, and must match the user's password if they're logging in
  if (password != null && can_continue) {
    if (password === "") errors.password = "Pasword must not be empty";
    else if (password.length < 8) errors.password = "Password is too short";
    else if (user && method == "login") {
      const matched = await bcrypt.compare(password, user.password);
      if (!matched) errors.password = "Password is incorrect";
    } else if (user && method == "update") {
      if (password === user.password)
        errors.password = "Password must be different than previous password";
    }
  }

  // screen name must not be empty
  if (screen_name != null) {
    if (screen_name.trim() === "")
      errors.screen_name = "Screen name must not be empty";
  }

  return {
    valid: Object.keys(errors).length < 1,
    errors,
    user: user ? user : null,
  };
};
