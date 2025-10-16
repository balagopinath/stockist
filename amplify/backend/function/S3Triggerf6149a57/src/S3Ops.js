const { getItemInfo } = require("./utilities");
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

async function faultyItem(bucket, itemInfo) {

    const targetKey = itemInfo.path + "/error/" + itemInfo.name;

    // Copy to error/ folder
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${targetKey}`,
        Key: destinationKey,
      })
    );

    // Delete original
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: itemInfo.Key,
      })
    );


}

module.exports = { faultyFile }