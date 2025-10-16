const { isCSVFile } = require("./utilities.js");
const { getCompany } = require("./queries.js");
const { faultyFile } = require("./S3Ops.js")

/* Amplify Params - DO NOT EDIT
	API_STOCKIST_GRAPHQLAPIENDPOINTOUTPUT
	API_STOCKIST_GRAPHQLAPIIDOUTPUT
	API_STOCKIST_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

exports.handler = async function (event) {

  console.log(process.env);
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  executeProcess(event.Records[0].s3.object.key)



  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  console.log(`Bucket: ${bucket}`, `Key: ${key}`);
};

async function executeProcess(csvFileKey) {
  let itemInfo = getItemInfo(itemKey);
  console.log("itemInfo : " + itemInfo);
  if(!isCSVFile(itemInfo)) {
    await faultyFile(itemInfo)
  }
} 