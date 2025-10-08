/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createUserProfile = /* GraphQL */ `
  mutation CreateUserProfile(
    $input: CreateUserProfileInput!
    $condition: ModelUserProfileConditionInput
  ) {
    createUserProfile(input: $input, condition: $condition) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateUserProfile = /* GraphQL */ `
  mutation UpdateUserProfile(
    $input: UpdateUserProfileInput!
    $condition: ModelUserProfileConditionInput
  ) {
    updateUserProfile(input: $input, condition: $condition) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteUserProfile = /* GraphQL */ `
  mutation DeleteUserProfile(
    $input: DeleteUserProfileInput!
    $condition: ModelUserProfileConditionInput
  ) {
    deleteUserProfile(input: $input, condition: $condition) {
      Id
      userId
      userName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createExchange = /* GraphQL */ `
  mutation CreateExchange(
    $input: CreateExchangeInput!
    $condition: ModelExchangeConditionInput
  ) {
    createExchange(input: $input, condition: $condition) {
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
export const updateExchange = /* GraphQL */ `
  mutation UpdateExchange(
    $input: UpdateExchangeInput!
    $condition: ModelExchangeConditionInput
  ) {
    updateExchange(input: $input, condition: $condition) {
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
export const deleteExchange = /* GraphQL */ `
  mutation DeleteExchange(
    $input: DeleteExchangeInput!
    $condition: ModelExchangeConditionInput
  ) {
    deleteExchange(input: $input, condition: $condition) {
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
export const createIndustrySector = /* GraphQL */ `
  mutation CreateIndustrySector(
    $input: CreateIndustrySectorInput!
    $condition: ModelIndustrySectorConditionInput
  ) {
    createIndustrySector(input: $input, condition: $condition) {
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
export const updateIndustrySector = /* GraphQL */ `
  mutation UpdateIndustrySector(
    $input: UpdateIndustrySectorInput!
    $condition: ModelIndustrySectorConditionInput
  ) {
    updateIndustrySector(input: $input, condition: $condition) {
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
export const deleteIndustrySector = /* GraphQL */ `
  mutation DeleteIndustrySector(
    $input: DeleteIndustrySectorInput!
    $condition: ModelIndustrySectorConditionInput
  ) {
    deleteIndustrySector(input: $input, condition: $condition) {
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
export const createIndustry = /* GraphQL */ `
  mutation CreateIndustry(
    $input: CreateIndustryInput!
    $condition: ModelIndustryConditionInput
  ) {
    createIndustry(input: $input, condition: $condition) {
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
export const updateIndustry = /* GraphQL */ `
  mutation UpdateIndustry(
    $input: UpdateIndustryInput!
    $condition: ModelIndustryConditionInput
  ) {
    updateIndustry(input: $input, condition: $condition) {
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
export const deleteIndustry = /* GraphQL */ `
  mutation DeleteIndustry(
    $input: DeleteIndustryInput!
    $condition: ModelIndustryConditionInput
  ) {
    deleteIndustry(input: $input, condition: $condition) {
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
export const createCompany = /* GraphQL */ `
  mutation CreateCompany(
    $input: CreateCompanyInput!
    $condition: ModelCompanyConditionInput
  ) {
    createCompany(input: $input, condition: $condition) {
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
export const updateCompany = /* GraphQL */ `
  mutation UpdateCompany(
    $input: UpdateCompanyInput!
    $condition: ModelCompanyConditionInput
  ) {
    updateCompany(input: $input, condition: $condition) {
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
export const deleteCompany = /* GraphQL */ `
  mutation DeleteCompany(
    $input: DeleteCompanyInput!
    $condition: ModelCompanyConditionInput
  ) {
    deleteCompany(input: $input, condition: $condition) {
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
export const createScript = /* GraphQL */ `
  mutation CreateScript(
    $input: CreateScriptInput!
    $condition: ModelScriptConditionInput
  ) {
    createScript(input: $input, condition: $condition) {
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
export const updateScript = /* GraphQL */ `
  mutation UpdateScript(
    $input: UpdateScriptInput!
    $condition: ModelScriptConditionInput
  ) {
    updateScript(input: $input, condition: $condition) {
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
export const deleteScript = /* GraphQL */ `
  mutation DeleteScript(
    $input: DeleteScriptInput!
    $condition: ModelScriptConditionInput
  ) {
    deleteScript(input: $input, condition: $condition) {
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
export const createStockTick = /* GraphQL */ `
  mutation CreateStockTick(
    $input: CreateStockTickInput!
    $condition: ModelStockTickConditionInput
  ) {
    createStockTick(input: $input, condition: $condition) {
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
export const updateStockTick = /* GraphQL */ `
  mutation UpdateStockTick(
    $input: UpdateStockTickInput!
    $condition: ModelStockTickConditionInput
  ) {
    updateStockTick(input: $input, condition: $condition) {
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
export const deleteStockTick = /* GraphQL */ `
  mutation DeleteStockTick(
    $input: DeleteStockTickInput!
    $condition: ModelStockTickConditionInput
  ) {
    deleteStockTick(input: $input, condition: $condition) {
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
export const createStockUserAssociation = /* GraphQL */ `
  mutation CreateStockUserAssociation(
    $input: CreateStockUserAssociationInput!
    $condition: ModelStockUserAssociationConditionInput
  ) {
    createStockUserAssociation(input: $input, condition: $condition) {
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
export const updateStockUserAssociation = /* GraphQL */ `
  mutation UpdateStockUserAssociation(
    $input: UpdateStockUserAssociationInput!
    $condition: ModelStockUserAssociationConditionInput
  ) {
    updateStockUserAssociation(input: $input, condition: $condition) {
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
export const deleteStockUserAssociation = /* GraphQL */ `
  mutation DeleteStockUserAssociation(
    $input: DeleteStockUserAssociationInput!
    $condition: ModelStockUserAssociationConditionInput
  ) {
    deleteStockUserAssociation(input: $input, condition: $condition) {
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
export const createTrade = /* GraphQL */ `
  mutation CreateTrade(
    $input: CreateTradeInput!
    $condition: ModelTradeConditionInput
  ) {
    createTrade(input: $input, condition: $condition) {
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
export const updateTrade = /* GraphQL */ `
  mutation UpdateTrade(
    $input: UpdateTradeInput!
    $condition: ModelTradeConditionInput
  ) {
    updateTrade(input: $input, condition: $condition) {
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
export const deleteTrade = /* GraphQL */ `
  mutation DeleteTrade(
    $input: DeleteTradeInput!
    $condition: ModelTradeConditionInput
  ) {
    deleteTrade(input: $input, condition: $condition) {
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
