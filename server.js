const { ApolloServer, PubSub } = require("apollo-server");
const mongoose = require("mongoose");

const typeDefs = require("./graphql/type_defs");
const resolvers = require("./graphql/resolvers");

const URI = process.env.MONGODB_URI;

// Subscriptions
const pubsub = new PubSub();

const PORT = process.env.PORT;

// Server parameters
const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions: {
    path: "/subscriptions",
  },
  context: ({ req, res }) => ({
    req,
    res,
    pubsub,
  }),
});

console.log("\nEstablishing connection to database...");

// database connection
mongoose
  .connect(URI, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(() => {
    console.log("Established connection to database");
    console.log("Starting server...");

    return server.listen({ port: PORT });
  })
  .then((res) => {
    console.log(`\nStarted server on address ${res.url}`);
  })
  .catch((err) => {
    console.error(`Error starting server:\n${err}\n`);
  });
