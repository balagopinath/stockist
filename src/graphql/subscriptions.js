/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUserProfile = /* GraphQL */ `
  subscription OnCreateUserProfile(
    $filter: ModelSubscriptionUserProfileFilterInput
  ) {
    onCreateUserProfile(filter: $filter) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUserProfile = /* GraphQL */ `
  subscription OnUpdateUserProfile(
    $filter: ModelSubscriptionUserProfileFilterInput
  ) {
    onUpdateUserProfile(filter: $filter) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUserProfile = /* GraphQL */ `
  subscription OnDeleteUserProfile(
    $filter: ModelSubscriptionUserProfileFilterInput
  ) {
    onDeleteUserProfile(filter: $filter) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateExchange = /* GraphQL */ `
  subscription OnCreateExchange($filter: ModelSubscriptionExchangeFilterInput) {
    onCreateExchange(filter: $filter) {
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
export const onUpdateExchange = /* GraphQL */ `
  subscription OnUpdateExchange($filter: ModelSubscriptionExchangeFilterInput) {
    onUpdateExchange(filter: $filter) {
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
export const onDeleteExchange = /* GraphQL */ `
  subscription OnDeleteExchange($filter: ModelSubscriptionExchangeFilterInput) {
    onDeleteExchange(filter: $filter) {
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
export const onCreateIndustrySector = /* GraphQL */ `
  subscription OnCreateIndustrySector(
    $filter: ModelSubscriptionIndustrySectorFilterInput
  ) {
    onCreateIndustrySector(filter: $filter) {
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
export const onUpdateIndustrySector = /* GraphQL */ `
  subscription OnUpdateIndustrySector(
    $filter: ModelSubscriptionIndustrySectorFilterInput
  ) {
    onUpdateIndustrySector(filter: $filter) {
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
export const onDeleteIndustrySector = /* GraphQL */ `
  subscription OnDeleteIndustrySector(
    $filter: ModelSubscriptionIndustrySectorFilterInput
  ) {
    onDeleteIndustrySector(filter: $filter) {
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
export const onCreateIndustry = /* GraphQL */ `
  subscription OnCreateIndustry($filter: ModelSubscriptionIndustryFilterInput) {
    onCreateIndustry(filter: $filter) {
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
export const onUpdateIndustry = /* GraphQL */ `
  subscription OnUpdateIndustry($filter: ModelSubscriptionIndustryFilterInput) {
    onUpdateIndustry(filter: $filter) {
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
export const onDeleteIndustry = /* GraphQL */ `
  subscription OnDeleteIndustry($filter: ModelSubscriptionIndustryFilterInput) {
    onDeleteIndustry(filter: $filter) {
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
export const onCreateCompany = /* GraphQL */ `
  subscription OnCreateCompany($filter: ModelSubscriptionCompanyFilterInput) {
    onCreateCompany(filter: $filter) {
      Id
      name
      ISIN
      MarketCap
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
export const onUpdateCompany = /* GraphQL */ `
  subscription OnUpdateCompany($filter: ModelSubscriptionCompanyFilterInput) {
    onUpdateCompany(filter: $filter) {
      Id
      name
      ISIN
      MarketCap
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
export const onDeleteCompany = /* GraphQL */ `
  subscription OnDeleteCompany($filter: ModelSubscriptionCompanyFilterInput) {
    onDeleteCompany(filter: $filter) {
      Id
      name
      ISIN
      MarketCap
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
export const onCreateScript = /* GraphQL */ `
  subscription OnCreateScript($filter: ModelSubscriptionScriptFilterInput) {
    onCreateScript(filter: $filter) {
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
        MarketCap
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
export const onUpdateScript = /* GraphQL */ `
  subscription OnUpdateScript($filter: ModelSubscriptionScriptFilterInput) {
    onUpdateScript(filter: $filter) {
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
        MarketCap
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
export const onDeleteScript = /* GraphQL */ `
  subscription OnDeleteScript($filter: ModelSubscriptionScriptFilterInput) {
    onDeleteScript(filter: $filter) {
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
        MarketCap
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
export const onCreateStockTick = /* GraphQL */ `
  subscription OnCreateStockTick(
    $filter: ModelSubscriptionStockTickFilterInput
  ) {
    onCreateStockTick(filter: $filter) {
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
export const onUpdateStockTick = /* GraphQL */ `
  subscription OnUpdateStockTick(
    $filter: ModelSubscriptionStockTickFilterInput
  ) {
    onUpdateStockTick(filter: $filter) {
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
export const onDeleteStockTick = /* GraphQL */ `
  subscription OnDeleteStockTick(
    $filter: ModelSubscriptionStockTickFilterInput
  ) {
    onDeleteStockTick(filter: $filter) {
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
export const onCreateStockUserAssociation = /* GraphQL */ `
  subscription OnCreateStockUserAssociation(
    $filter: ModelSubscriptionStockUserAssociationFilterInput
  ) {
    onCreateStockUserAssociation(filter: $filter) {
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
export const onUpdateStockUserAssociation = /* GraphQL */ `
  subscription OnUpdateStockUserAssociation(
    $filter: ModelSubscriptionStockUserAssociationFilterInput
  ) {
    onUpdateStockUserAssociation(filter: $filter) {
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
export const onDeleteStockUserAssociation = /* GraphQL */ `
  subscription OnDeleteStockUserAssociation(
    $filter: ModelSubscriptionStockUserAssociationFilterInput
  ) {
    onDeleteStockUserAssociation(filter: $filter) {
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
export const onCreateTrade = /* GraphQL */ `
  subscription OnCreateTrade($filter: ModelSubscriptionTradeFilterInput) {
    onCreateTrade(filter: $filter) {
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
export const onUpdateTrade = /* GraphQL */ `
  subscription OnUpdateTrade($filter: ModelSubscriptionTradeFilterInput) {
    onUpdateTrade(filter: $filter) {
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
export const onDeleteTrade = /* GraphQL */ `
  subscription OnDeleteTrade($filter: ModelSubscriptionTradeFilterInput) {
    onDeleteTrade(filter: $filter) {
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
