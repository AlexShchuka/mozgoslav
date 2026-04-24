# auto-remove unused usings

`dotnet format style` strips unused `using` directives via IDE0005. Wire it as an automatic fix in lefthook pre-commit on staged C# files, and as a CI error when the full `dotnet format --verify-no-changes` lands. The rule is: zero unused usings ever reach main.
