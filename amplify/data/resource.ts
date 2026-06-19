import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Starter schema for the fresh build.
 *
 * Replace the placeholder `Todo` model with your real domain models
 * (e.g. Exchange, Industry, Company, Script, Trade). Each `a.model(...)`
 * becomes a DynamoDB table + AppSync GraphQL types automatically.
 *
 * Authorization mirrors the old Gen 1 default (public via API key). Switch
 * individual models to `allow.authenticated()` or `allow.owner()` as you
 * lock things down.
 * @see https://docs.amplify.aws/react/build-a-backend/data/
 */
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      done: a.boolean(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
