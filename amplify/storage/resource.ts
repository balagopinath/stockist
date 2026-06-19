import { defineStorage } from '@aws-amplify/backend';

/**
 * S3 storage, mirroring the previous Gen 1 bucket:
 * - Authenticated users get read / write / delete
 * - No guest (unauthenticated) access
 * @see https://docs.amplify.aws/react/build-a-backend/storage/
 */
export const storage = defineStorage({
  name: 'stockistMasters',
  access: (allow) => ({
    'masters/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
