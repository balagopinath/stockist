import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito auth, mirroring the previous Gen 1 setup:
 * - Email is the sign-in alias and is auto-verified
 * - MFA off
 * - Min password length 8
 *
 * Groups:
 * - "admin" — members get full access to admin-only models (e.g. Company).
 *   Add users to this group from the Cognito console (User pool → Groups)
 *   or via the CLI; there is no self-service path into it.
 * @see https://docs.amplify.aws/react/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['admin'],
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
});
