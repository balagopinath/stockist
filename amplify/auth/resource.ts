import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito auth, mirroring the previous Gen 1 setup:
 * - Email is the sign-in alias and is auto-verified
 * - MFA off
 * - Min password length 8
 * @see https://docs.amplify.aws/react/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
});
