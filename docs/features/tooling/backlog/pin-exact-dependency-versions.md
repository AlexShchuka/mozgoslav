# pin exact dependency versions

Switch from floating majors to exact pins across stacks: `Directory.Packages.props` (remove `*` on majors), frontend `package.json` (use `--save-exact`), python `requirements.txt` (replace `>=` with `==`). Agents bumping dependencies then cannot silently drag in a major.
