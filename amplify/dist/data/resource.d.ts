import { type ClientSchema } from '@aws-amplify/backend';
declare const schema: import("@aws-amplify/data-schema").ModelSchema<{
    types: {
        TimeRecord: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                id: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                userId: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                projectName: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                description: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                startTime: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                endTime: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                duration: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Integer>;
                tags: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>[] | null, "array" | "validate", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                updatedAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (import("@aws-amplify/data-schema").Authorization<"owner", "owner", false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            identityClaim: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "identityClaim">;
        })[]>, "authorization">;
        Project: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                id: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                name: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                description: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                color: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                userId: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                isActive: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<boolean>, "default", undefined, import("@aws-amplify/data-schema").ModelFieldType.Boolean>;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                updatedAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (import("@aws-amplify/data-schema").Authorization<"owner", "owner", false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            identityClaim: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "identityClaim">;
        })[]>, "authorization">;
    };
    authorization: [];
    configuration: any;
}, never>;
export type Schema = ClientSchema<typeof schema>;
export declare const data: import("@aws-amplify/plugin-types").ConstructFactory<import("@aws-amplify/graphql-api-construct").AmplifyGraphqlApi>;
export {};
