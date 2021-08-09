const { gql } = require("apollo-server");

module.exports = gql`
  type User {
    id: ID!
    email: String
    password: String
    screen_name: String!
    lists: [Shortened_List!]!
    join_date: String!
  }
  type Shortened_User {
    id: ID!
    screen_name: String!
  }
  type Tokened_User {
    token: String!
    user: User!
  }
  type List {
    id: ID!
    owner: ID!
    list_name: String!
    code: String!
    members: [Shortened_User!]!
    items: [Item!]!
    created: String!
    last_modified: String!
  }
  type Shortened_List {
    id: ID!
    list_name: String!
    owned: Boolean!
    members: [Shortened_User!]
    last_modified: String!
  }
  type List_Properties {
    owner: ID
    list_name: String
    code: String
  }
  type Item {
    id: ID!
    name: String!
    member: String
    purchased: Boolean!
    last_modified: String!
  }

  type item_update {
    type: String!
    affector: Shortened_User!
    item: Item!
  }
  type member_update {
    type: String!
    affector: Shortened_User!
    member: Shortened_User!
  }
  type list_update {
    type: String!
    affector: Shortened_User!
    list: List_Properties!
  }

  input registration_info {
    email: String!
    password: String!
    confirm_password: String!
    screen_name: String!
  }

  type Query {
    # User Queries
    get_every_user: [User!]
    get_user(userID: ID!): User

    # List Queries
    get_list(listID: ID!): List
    get_user_lists(userID: ID!): [Shortened_List!]
  }
  type Mutation {
    # User Functionality
    register(info: registration_info): Tokened_User!
    login(email: String!, password: String!): User!
    create_temp_user(screen_name: String!): Tokened_User!
    upgrade_temp_user(email: String!, password: String!): Tokened_User!
    delete_user: User!
    generate_new_token: Tokened_User!

    # List Functionality
    create_list(list_name: String!): List!
    join_list(code: String!): List!
    leave_list(listID: ID!): List!
    delete_list(listID: ID!): List!
    update_list(
      listID: ID!
      owner: ID!
      list_name: String
      generate_new_code: Boolean
    ): List!

    # Item Functionality
    add_item(name: String!, listID: ID!): Item!
    remove_item(listID: ID!, itemID: ID!): Item!
    claim_item(listID: ID!, itemID: ID!, method: String): Item!
    purchase_item(listID: ID!, itemID: ID!, method: String): Item!
  }
  type Subscription {
    item_updates(listID: ID!): item_update!
    member_updates(listID: ID!): member_update!
    list_updates(listID: ID!): list_update!
  }
`;
