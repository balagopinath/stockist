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
      companies {
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
      companies {
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
      companies {
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
export const updateCompany = /* GraphQL */ `
  mutation UpdateCompany(
    $input: UpdateCompanyInput!
    $condition: ModelCompanyConditionInput
  ) {
    updateCompany(input: $input, condition: $condition) {
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
export const deleteCompany = /* GraphQL */ `
  mutation DeleteCompany(
    $input: DeleteCompanyInput!
    $condition: ModelCompanyConditionInput
  ) {
    deleteCompany(input: $input, condition: $condition) {
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
export const createStock = /* GraphQL */ `
  mutation CreateStock(
    $input: CreateStockInput!
    $condition: ModelStockConditionInput
  ) {
    createStock(input: $input, condition: $condition) {
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
export const updateStock = /* GraphQL */ `
  mutation UpdateStock(
    $input: UpdateStockInput!
    $condition: ModelStockConditionInput
  ) {
    updateStock(input: $input, condition: $condition) {
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
export const deleteStock = /* GraphQL */ `
  mutation DeleteStock(
    $input: DeleteStockInput!
    $condition: ModelStockConditionInput
  ) {
    deleteStock(input: $input, condition: $condition) {
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
export const createStockTick = /* GraphQL */ `
  mutation CreateStockTick(
    $input: CreateStockTickInput!
    $condition: ModelStockTickConditionInput
  ) {
    createStockTick(input: $input, condition: $condition) {
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
export const updateStockTick = /* GraphQL */ `
  mutation UpdateStockTick(
    $input: UpdateStockTickInput!
    $condition: ModelStockTickConditionInput
  ) {
    updateStockTick(input: $input, condition: $condition) {
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
export const deleteStockTick = /* GraphQL */ `
  mutation DeleteStockTick(
    $input: DeleteStockTickInput!
    $condition: ModelStockTickConditionInput
  ) {
    deleteStockTick(input: $input, condition: $condition) {
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
export const createStockUserAssociation = /* GraphQL */ `
  mutation CreateStockUserAssociation(
    $input: CreateStockUserAssociationInput!
    $condition: ModelStockUserAssociationConditionInput
  ) {
    createStockUserAssociation(input: $input, condition: $condition) {
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
export const updateStockUserAssociation = /* GraphQL */ `
  mutation UpdateStockUserAssociation(
    $input: UpdateStockUserAssociationInput!
    $condition: ModelStockUserAssociationConditionInput
  ) {
    updateStockUserAssociation(input: $input, condition: $condition) {
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
export const deleteStockUserAssociation = /* GraphQL */ `
  mutation DeleteStockUserAssociation(
    $input: DeleteStockUserAssociationInput!
    $condition: ModelStockUserAssociationConditionInput
  ) {
    deleteStockUserAssociation(input: $input, condition: $condition) {
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
export const createTrade = /* GraphQL */ `
  mutation CreateTrade(
    $input: CreateTradeInput!
    $condition: ModelTradeConditionInput
  ) {
    createTrade(input: $input, condition: $condition) {
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
export const updateTrade = /* GraphQL */ `
  mutation UpdateTrade(
    $input: UpdateTradeInput!
    $condition: ModelTradeConditionInput
  ) {
    updateTrade(input: $input, condition: $condition) {
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
export const deleteTrade = /* GraphQL */ `
  mutation DeleteTrade(
    $input: DeleteTradeInput!
    $condition: ModelTradeConditionInput
  ) {
    deleteTrade(input: $input, condition: $condition) {
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
