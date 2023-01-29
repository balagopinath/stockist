/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const addExchange = /* GraphQL */ `
  mutation AddExchange($name: String, $description: String, $priority: Int) {
    addExchange(name: $name, description: $description, priority: $priority) {
      id
      name
      description
      priority
    }
  }
`;
export const addUserProfile = /* GraphQL */ `
  mutation AddUserProfile($name: String, $userId: String) {
    addUserProfile(name: $name, userId: $userId) {
      id
      name
      userId
    }
  }
`;
