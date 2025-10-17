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