import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  TimeRecord: a
    .model({
      id: a.id(),
      userId: a.string().required(),
      projectName: a.string().required(),
      description: a.string(),
      startTime: a.datetime().required(),
      endTime: a.datetime(),
      duration: a.integer(), // Duration in minutes
      tags: a.string().array(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  Project: a
    .model({
      id: a.id(),
      name: a.string().required(),
      description: a.string(),
      color: a.string(),
      userId: a.string().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});