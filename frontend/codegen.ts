import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../schema.graphql",
  documents: ["src/api/operations/**/*.graphql"],
  generates: {
    "src/api/gql/": {
      preset: "client",
      config: {
        useTypeImports: true,
        scalars: {
          DateTime: "string",
          Guid: "string",
          UUID: "string",
        },
      },
    },
  },
  hooks: {
    afterAllFileWrite: ["prettier --write"],
  },
};

export default config;
