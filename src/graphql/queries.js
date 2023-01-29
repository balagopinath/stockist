/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getExchanges = /* GraphQL */ `
  query GetExchanges {
    getExchanges {
      id
      name
      description
      priority
    }
  }
`;
export const getUserProfiles = /* GraphQL */ `
  query GetUserProfiles {
    getUserProfiles {
      id
      name
      userId
    }
  }
`;
export const getUserProfile = /* GraphQL */ `
  query GetUserProfile($filter: ModelUserProfileFilterInput) {
    getUserProfile(filter: $filter) {
      id
      name
      userId
    }
  }
`;
