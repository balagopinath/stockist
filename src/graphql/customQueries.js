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
        industry {
          Id
          name
        }        
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
        exchange {
          Id
          name
        }         
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
        parentIndustryId
        parentIndustry {
          Id
          name
        }         
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;