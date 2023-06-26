Originally, our test files lived alongside the code they tested. However, this confused VS Code – it couldn't figure out which `tsconfig.json` to use. Instead we place test files in a test-only sibling directory. Each source file src/foo/bar/baz.ts{x} should have its test at test/foo/bar/baz_test.ts{x}.

By creating a test-only directory, VS Code finds the proper `tsconfig.json`.
