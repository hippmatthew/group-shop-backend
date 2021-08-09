const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server");

const { SECRET } = require("../config.js");

module.exports = (req) => {
  /* 1) Get the token from the request
   * 2) Verify the token and get the payload
   */

  const auth_header = req.headers.authorization;
  if (auth_header) {
    const token = auth_header.split("Bearer ")[1];
    if (token) {
      try {
        const user = jwt.verify(token, SECRET);
        return user;
      } catch (err) {
        throw new AuthenticationError("invalid or expired token");
      }
    }
    throw new Error("Auth Format: 'Bearer <token>'");
  }
  throw new Error("Auth header must be provided");
};
