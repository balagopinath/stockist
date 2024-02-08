/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUserProfile = /* GraphQL */ `
  query GetUserProfile($Id: ID!) {
    getUserProfile(Id: $Id) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listUserProfiles = /* GraphQL */ `
  query ListUserProfiles(
    $Id: ID
    $filter: ModelUserProfileFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listUserProfiles(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        userId
        userName
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
