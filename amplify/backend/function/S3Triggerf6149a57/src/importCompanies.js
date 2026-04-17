import { getObjectsFromStream } from './utilities.js'
import { addIndustry, addExchange, getIndustriesWithNames, getExchangesWithCodes, getIndustryByName, getExchangeByCode, getCompanyByISIN }  from './APISync.js';


function getMissingItems(allItems, items) {
      return allItems.filter(item => !items.includes(item));
}

export async function importCompanies(s3Response) {
      try {
            const data = await getObjectsFromStream(s3Response.Body);

            const uniqIndustries = [...new Set(data.map(item => item.Industry))];
            const uniqExchanges = [...new Set(data.map(item => item.Exchange))];

            let exchanges =  await getExchangesWithCodes(uniqExchanges);
            let industries = await getIndustriesWithNames(uniqIndustries);

            let missingItems = getMissingItems(uniqExchanges, exchanges.map(ex => ex.code));
            for (const element of missingItems) {
                  exchanges.push(await addExchange({ name: '', code: element }));
            }            

            missingItems = getMissingItems(uniqIndustries, industries.map(ind => ind.name));
            for (const element of missingItems) {
                  industries.push(await addIndustry({name: element}));
            }            
            console.log("Missing industries in db : " + missingItems);
            console.log("Temp")
            await data.forEach(async element =>  {
                  var industry = await getIndustryByName(element.Industry)
                  if(!industry) {
                        industry = addIndustry({name: element.Industry })
                  } 
                  var exchange = getExchangeByCode(element.Exchange)
                  if(!exchange) {
                        exchange = addExchange({name: '', code: element.exchange})
                  }
                  const dbRow = await getCompanyByISIN(element.ISIN);
                  if(!dbRow) {
                        console.log("Company '"  + element.Name + "' not found");
                        
                  }
            });
            } 
      catch (exp) {
            console.log(exp);
      }
}