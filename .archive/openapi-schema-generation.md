# OpenAPI schema generation

Add Swashbuckle or NSwag to the backend and emit `openapi.json` as a build artifact committed to the repo. Gives agents and the frontend a single machine-readable API contract instead of scraping `MapXxxEndpoints` strings. CI step regenerates and diffs the file on every PR — schema drift fails the build.
