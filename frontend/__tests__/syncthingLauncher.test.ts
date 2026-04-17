import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import { parseConfig } from "../electron/utils/syncthingLauncher";

describe("syncthingLauncher.parseConfig", () => {
  let home: string;
  let configPath: string;

  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), "mozgoslav-syncthing-"));
    configPath = path.join(home, "config.xml");
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it("extracts apikey and address from a full config.xml", () => {
    writeFileSync(
      configPath,
      `
<configuration version="37">
  <gui enabled="true" tls="false" debugging="false">
    <address>127.0.0.1:19456</address>
    <apikey>super-secret-key</apikey>
  </gui>
</configuration>
      `.trim()
    );

    const config = parseConfig(configPath, home);

    expect(config).toEqual({
      apiKey: "super-secret-key",
      baseUrl: "http://127.0.0.1:19456",
      homeDir: home,
    });
  });

  it("returns null when the apikey tag has not been written yet", () => {
    writeFileSync(
      configPath,
      `
<configuration version="37">
  <gui enabled="true">
    <address>127.0.0.1:8384</address>
  </gui>
</configuration>
      `.trim()
    );

    expect(parseConfig(configPath, home)).toBeNull();
  });

  it("defaults to 127.0.0.1:8384 when the address tag is missing", () => {
    writeFileSync(
      configPath,
      `
<configuration version="37">
  <gui>
    <apikey>only-key</apikey>
  </gui>
</configuration>
      `.trim()
    );

    const config = parseConfig(configPath, home);
    expect(config).toEqual({
      apiKey: "only-key",
      baseUrl: "http://127.0.0.1:8384",
      homeDir: home,
    });
  });

  it("preserves an existing http:// prefix in the address", () => {
    writeFileSync(
      configPath,
      `
<configuration version="37">
  <gui>
    <address>http://0.0.0.0:9000</address>
    <apikey>k</apikey>
  </gui>
</configuration>
      `.trim()
    );

    expect(parseConfig(configPath, home)?.baseUrl).toBe("http://0.0.0.0:9000");
  });
});
