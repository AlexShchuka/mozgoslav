PLACEHOLDER: Real .shortcut blobs must be exported from Shortcuts.app on macOS by shuka.

Files needed (export from Shortcuts.app as .shortcut, then place here):
  - MozgoslavAddReminder.shortcut
  - MozgoslavAddCalendarEvent.shortcut
  - MozgoslavOpenFile.shortcut

Export steps:
1. Open Shortcuts.app on macOS
2. Create the shortcut with the correct name (see SystemActionTemplates.cs for names)
3. Right-click → Share → File → Save as .shortcut
4. Copy the .shortcut file to this directory
5. Update SystemActionTemplates.cs with correct deeplink URL paths if hosting changes

These .shortcut files are distributed to users as deeplinks via the onboarding wizard
(Settings -> System Actions -> Import Default Shortcuts).
