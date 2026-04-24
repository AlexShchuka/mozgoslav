# upgrade all dependencies to latest

Bump everything to the latest stable: .NET SDK + NuGet packages (via `Directory.Packages.props`), npm packages, Python wheels, Swift package pins, CI actions, Electron, Node, Python runtimes. Done as one coordinated sweep, not scattered version bumps. Gate each wave on a full green CI.
