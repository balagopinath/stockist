import { isCSVFile, getItemInfo } from './utilities.js';
import { faultyItem, getItem } from './S3Ops.js';
import { importCompanies } from './importCompanies.js';


/* Amplify Params - DO NOT EDIT
	API_STOCKIST_GRAPHQLAPIENDPOINTOUTPUT
	API_STOCKIST_GRAPHQLAPIIDOUTPUT
	API_STOCKIST_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

export const handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  switch(event.Records[0].eventName) {
      case "ObjectCreated:Put":
      case "ObjectCreated:Copy":
        await executeProcess(bucket, key)
        break;
  }
  console.log(`Bucket: ${bucket}`, `Key: ${key}`);
};

async function executeProcess(bucket, itemKey) {
    const itemInfo = getItemInfo(itemKey);
    console.log("itemInfo : " + JSON.stringify(itemInfo));

    switch(itemInfo.path) {
      case "public/Companies/": 
        if(!isCSVFile(itemInfo)) {
          await faultyItem(bucket, itemInfo)
        }
        try {
          const res = await getItem(bucket, itemInfo);
          await importCompanies(res);
        } catch(ex) {
          console.log(ex);
        }
        break;
    }
} 