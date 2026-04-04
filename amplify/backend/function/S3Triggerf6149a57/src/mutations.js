export const createIndustry = /* GraphQL */ `
  mutation CreateIndustry(
    $input: CreateIndustryInput!
    $condition: ModelIndustryConditionInput
  ) {
    createIndustry(input: $input, condition: $condition) {
      Id
      name
      companies {
        nextToken
        __typename
      }
      parentIndustryId
      parentIndustry {
        Id
        name
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