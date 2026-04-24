# encoding check

CI step that fails when any tracked text file is not UTF-8, carries a BOM, or uses CRLF line endings (outside Windows-only scripts). A trivial `git ls-files | xargs file` plus a BOM/CRLF grep keeps the repo byte-clean — agents otherwise mismatch on invisible whitespace between platforms.
