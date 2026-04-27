import type { MutationObsidianRunDiagnosticsMutation } from "../../../api/gql/graphql";
import type { VaultDiagnosticsReport } from "./apiTypes";

type GqlReport = NonNullable<
  MutationObsidianRunDiagnosticsMutation["obsidianRunDiagnostics"]["report"]
>;

export const mapGqlDiagnostics = (gql: GqlReport): VaultDiagnosticsReport => ({
  snapshotId: gql.snapshotId,
  generatedAt: gql.generatedAt,
  isHealthy: gql.isHealthy,
  vault: {
    ok: gql.vault.ok,
    severity: gql.vault.severity,
    code: gql.vault.code,
    message: gql.vault.message,
    actions: gql.vault.actions,
    vaultPath: gql.vault.vaultPath,
  },
  plugins: gql.plugins.map((p) => ({
    pluginId: p.pluginId,
    installed: p.installed,
    enabled: p.enabled,
    hashMatches: p.hashMatches,
    optional: p.optional,
    expectedVersion: p.expectedVersion,
    installedVersion: p.installedVersion ?? null,
    severity: p.severity,
    code: p.code,
    message: p.message,
    actions: p.actions,
    ok: p.ok,
  })),
  templater: {
    ok: gql.templater.ok,
    severity: gql.templater.severity,
    code: gql.templater.code,
    message: gql.templater.message,
    actions: gql.templater.actions,
    templatesFolder: gql.templater.templatesFolder ?? null,
    userScriptsFolder: gql.templater.userScriptsFolder ?? null,
  },
  bootstrap: {
    ok: gql.bootstrap.ok,
    severity: gql.bootstrap.severity,
    code: gql.bootstrap.code,
    message: gql.bootstrap.message,
    actions: gql.bootstrap.actions,
    files: gql.bootstrap.files.map((f) => ({
      vaultRelativePath: f.vaultRelativePath,
      status: f.status,
      expectedSha256: f.expectedSha256,
      actualSha256: f.actualSha256 ?? null,
    })),
  },
  restApi: {
    ok: gql.restApi.ok,
    required: gql.restApi.required,
    severity: gql.restApi.severity,
    code: gql.restApi.code,
    message: gql.restApi.message,
    actions: gql.restApi.actions,
    host: gql.restApi.host ?? null,
    version: gql.restApi.version ?? null,
  },
  lmStudio: {
    ok: gql.lmStudio.ok,
    severity: gql.lmStudio.severity,
    code: gql.lmStudio.code,
    message: gql.lmStudio.message,
    actions: gql.lmStudio.actions,
    endpoint: gql.lmStudio.endpoint ?? null,
  },
});
