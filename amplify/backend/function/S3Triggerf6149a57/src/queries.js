  export const getCompany = `
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
    }`;

export const getCompaniesByISIN = `
query ListCompaniesByISIN($ISIN: String) {
  listCompanies(filter: { ISIN: { eq: $ISIN } }) {
    items {
      Id
      name
      ISIN
      marketCap
      industryId
    }
  }
}`;

export const getIndustriesByName = /* GraphQL */ `
  query getIndustriesByName($name: String) {
    listIndustries(filter: { name: { eq: $name } }) {
      items {
        Id
        name
      }
    }
}`;

export const getIndustries = /* GraphQL */ `
  query getIndustriesByName {
    listIndustries {
      items {
        Id
        name
      }
    }
}`;

export const getExchangesByCode = /* GraphQL */ `
  query getExchangesByCode($code: String) {
    listExchanges(filter: { code: { eq: $code } }) {
      items {
        Id
        name
        code
      }
    }
}`;

export const getExchanges = /* GraphQL */ `
  query getExchangesByCodes {
    listExchanges {
      items {
        Id
        name
        code
      }
    }
  }
`;