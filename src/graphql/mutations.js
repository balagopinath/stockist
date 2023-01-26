/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const addExchange = /* GraphQL */ `
  mutation AddExchange(
    $id: ID!
    $name: String
    $description: String
    $priority: Int
  ) {
    addExchange(
      id: $id
      name: $name
      description: $description
      priority: $priority
    ) {
      id
      name
      description
      priority
    }
  }
`;
