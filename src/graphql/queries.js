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
export const getExchange = /* GraphQL */ `
  query GetExchange($Id: ID!) {
    getExchange(Id: $Id) {
      Id
      name
      code
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listExchanges = /* GraphQL */ `
  query ListExchanges(
    $Id: ID
    $filter: ModelExchangeFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listExchanges(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        name
        code
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getIndustrySector = /* GraphQL */ `
  query GetIndustrySector($Id: ID!) {
    getIndustrySector(Id: $Id) {
      Id
      name
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listIndustrySectors = /* GraphQL */ `
  query ListIndustrySectors(
    $Id: ID
    $filter: ModelIndustrySectorFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listIndustrySectors(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        name
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getCompany = /* GraphQL */ `
  query GetCompany($Id: ID!) {
    getCompany(Id: $Id) {
      Id
      name
      industryId
      industry {
        Id
        name
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listCompanies = /* GraphQL */ `
  query ListCompanies(
    $Id: ID
    $filter: ModelCompanyFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listCompanies(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        name
        industryId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getStock = /* GraphQL */ `
  query GetStock($Id: ID!) {
    getStock(Id: $Id) {
      Id
      exchange {
        Id
        name
        code
        createdAt
        updatedAt
        __typename
      }
      company {
        Id
        name
        industryId
        createdAt
        updatedAt
        __typename
      }
      code
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listStocks = /* GraphQL */ `
  query ListStocks(
    $Id: ID
    $filter: ModelStockFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listStocks(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        code
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getStockTick = /* GraphQL */ `
  query GetStockTick($Id: ID!) {
    getStockTick(Id: $Id) {
      Id
      stock {
        Id
        code
        createdAt
        updatedAt
        __typename
      }
      LTP
      tickTime
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listStockTicks = /* GraphQL */ `
  query ListStockTicks(
    $Id: ID
    $filter: ModelStockTickFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listStockTicks(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        LTP
        tickTime
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getStockUserAssociation = /* GraphQL */ `
  query GetStockUserAssociation($Id: ID!) {
    getStockUserAssociation(Id: $Id) {
      Id
      stock {
        Id
        code
        createdAt
        updatedAt
        __typename
      }
      userProfile {
        Id
        userId
        userName
        createdAt
        updatedAt
        __typename
      }
      openingStocks
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listStockUserAssociations = /* GraphQL */ `
  query ListStockUserAssociations(
    $Id: ID
    $filter: ModelStockUserAssociationFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listStockUserAssociations(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        openingStocks
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getTrade = /* GraphQL */ `
  query GetTrade($Id: ID!) {
    getTrade(Id: $Id) {
      Id
      stockUser {
        Id
        openingStocks
        createdAt
        updatedAt
        __typename
      }
      isBuy
      price
      tranDate
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listTrades = /* GraphQL */ `
  query ListTrades(
    $Id: ID
    $filter: ModelTradeFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listTrades(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        isBuy
        price
        tranDate
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const userProfilesByUserIdAndId = /* GraphQL */ `
  query UserProfilesByUserIdAndId(
    $userId: String!
    $Id: ModelIDKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelUserProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userProfilesByUserIdAndId(
      userId: $userId
      Id: $Id
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
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
