import { getItemInfo } from './utilities.js';

import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "ap-south-1" });

export async function faultyItem(bucket, itemInfo) {

    const targetKey = itemInfo.path + "error/" + itemInfo.name;

    console.log("Copying the file to error");
    // Copy to error/ folder
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${itemInfo.key}`,
        Key: targetKey,
      })
    );
    console.log("Copying the file to error - DONE");

    console.log("Deleting the original file");
    // Delete original
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: itemInfo.key,
      })
    );
    console.log("Deleting the original file - DONE");    

}