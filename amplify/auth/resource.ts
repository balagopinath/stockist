import { referenceAuth } from '@aws-amplify/backend';

/**
 * Stockist uses the shared auth owned by gopsweb (Amplify app d2tt60fanegk1u).
 * Do not define auth here; manage users and groups in gopsweb's user pool.
 */
export const auth = referenceAuth({
  userPoolId: 'ap-south-1_LaiamNdqk',
  identityPoolId: 'ap-south-1:7a8c14e2-4719-4c48-bd75-0a3fbd97e5a9',
  userPoolClientId: '2olkptiikpqfuvb8i6dkci7od8',
  authRoleArn:
    'arn:aws:iam::747387283150:role/amplify-d2tt60fanegk1u-ma-amplifyAuthauthenticatedU-hUTMywbTvyYg',
  unauthRoleArn:
    'arn:aws:iam::747387283150:role/amplify-d2tt60fanegk1u-ma-amplifyAuthunauthenticate-HXLoEoTsrit3',
  groups: {
    admin:
      'arn:aws:iam::747387283150:role/amplify-d2tt60fanegk1u-ma-amplifyAuthadminGroupRole-FXOBWnqX3AUL',
  },
});
