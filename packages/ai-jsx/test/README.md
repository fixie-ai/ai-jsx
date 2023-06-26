Originally, our test files lived alongside the code they tested. However, this confused VS Code – it couldn't figure out which `tsconfig.json` to use.

By creating a test-only directory, VS Code finds the proper `tsconfig.json`.
