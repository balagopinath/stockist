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
      stocks {
        nextToken
        __typename
      }
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
      industries {
        nextToken
        __typename
      }
      parentISId
      parentIndustrySector {
        Id
        name
        parentISId
        createdAt
        updatedAt
        __typename
      }
      subIndustrySectors {
        nextToken
        __typename
      }
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
        parentISId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getIndustry = /* GraphQL */ `
  query GetIndustry($Id: ID!) {
    getIndustry(Id: $Id) {
      Id
      name
      industrySectorId
      industrySector {
        Id
        name
        parentISId
        createdAt
        updatedAt
        __typename
      }
      companies {
        nextToken
        __typename
      }
      parentIndustryId
      parentIndustry {
        Id
        name
        industrySectorId
        parentIndustryId
        createdAt
        updatedAt
        __typename
      }
      subIndustries {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listIndustries = /* GraphQL */ `
  query ListIndustries(
    $Id: ID
    $filter: ModelIndustryFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listIndustries(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        name
        industrySectorId
        parentIndustryId
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
      ISIN
      marketCap
      industryId
      industry {
        Id
        name
        industrySectorId
        parentIndustryId
        createdAt
        updatedAt
        __typename
      }
      scripts {
        nextToken
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
        ISIN
        marketCap
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
export const getScript = /* GraphQL */ `
  query GetScript($Id: ID!) {
    getScript(Id: $Id) {
      Id
      exchangeId
      exchange {
        Id
        name
        code
        createdAt
        updatedAt
        __typename
      }
      companyId
      company {
        Id
        name
        ISIN
        marketCap
        industryId
        createdAt
        updatedAt
        __typename
      }
      code
      LTP
      LTV
      TradedAt
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listScripts = /* GraphQL */ `
  query ListScripts(
    $Id: ID
    $filter: ModelScriptFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listScripts(
      Id: $Id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        Id
        exchangeId
        companyId
        code
        LTP
        LTV
        TradedAt
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
      stockId
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
        stockId
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
      stockId
      userProfileId
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
        stockId
        userProfileId
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
      stockUserId
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
        stockUserId
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
export const industrySectorsByParentISId = /* GraphQL */ `
  query IndustrySectorsByParentISId(
    $parentISId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelIndustrySectorFilterInput
    $limit: Int
    $nextToken: String
  ) {
    industrySectorsByParentISId(
      parentISId: $parentISId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        name
        parentISId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const industriesByIndustrySectorId = /* GraphQL */ `
  query IndustriesByIndustrySectorId(
    $industrySectorId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelIndustryFilterInput
    $limit: Int
    $nextToken: String
  ) {
    industriesByIndustrySectorId(
      industrySectorId: $industrySectorId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        name
        industrySectorId
        parentIndustryId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const industriesByParentIndustryId = /* GraphQL */ `
  query IndustriesByParentIndustryId(
    $parentIndustryId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelIndustryFilterInput
    $limit: Int
    $nextToken: String
  ) {
    industriesByParentIndustryId(
      parentIndustryId: $parentIndustryId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        name
        industrySectorId
        parentIndustryId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const companiesByIndustryId = /* GraphQL */ `
  query CompaniesByIndustryId(
    $industryId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelCompanyFilterInput
    $limit: Int
    $nextToken: String
  ) {
    companiesByIndustryId(
      industryId: $industryId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        name
        ISIN
        marketCap
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
export const scriptsByExchangeId = /* GraphQL */ `
  query ScriptsByExchangeId(
    $exchangeId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelScriptFilterInput
    $limit: Int
    $nextToken: String
  ) {
    scriptsByExchangeId(
      exchangeId: $exchangeId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        exchangeId
        companyId
        code
        LTP
        LTV
        TradedAt
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const scriptsByCompanyId = /* GraphQL */ `
  query ScriptsByCompanyId(
    $companyId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelScriptFilterInput
    $limit: Int
    $nextToken: String
  ) {
    scriptsByCompanyId(
      companyId: $companyId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        exchangeId
        companyId
        code
        LTP
        LTV
        TradedAt
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const stockTicksByStockId = /* GraphQL */ `
  query StockTicksByStockId(
    $stockId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelStockTickFilterInput
    $limit: Int
    $nextToken: String
  ) {
    stockTicksByStockId(
      stockId: $stockId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        stockId
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
export const stockUserAssociationsByStockId = /* GraphQL */ `
  query StockUserAssociationsByStockId(
    $stockId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelStockUserAssociationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    stockUserAssociationsByStockId(
      stockId: $stockId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        stockId
        userProfileId
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
export const stockUserAssociationsByUserProfileId = /* GraphQL */ `
  query StockUserAssociationsByUserProfileId(
    $userProfileId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelStockUserAssociationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    stockUserAssociationsByUserProfileId(
      userProfileId: $userProfileId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        stockId
        userProfileId
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
export const tradesByStockUserId = /* GraphQL */ `
  query TradesByStockUserId(
    $stockUserId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelTradeFilterInput
    $limit: Int
    $nextToken: String
  ) {
    tradesByStockUserId(
      stockUserId: $stockUserId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        Id
        stockUserId
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
