import { defineAuth } from '@aws-amplify/backend';
export const auth = defineAuth({
    loginWith: {
        email: true,
    },
    userAttributes: {
        email: {
            mutable: true,
            required: true,
        },
        givenName: {
            mutable: true,
            required: false,
        },
        familyName: {
            mutable: true,
            required: false,
        },
    },
});
