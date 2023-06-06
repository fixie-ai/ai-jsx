# Misc Dev Notes

## TypeScript / `tsx`

If you pass the `--tsconfig` flag to `tsx`, it needs to be before the entry point:

```
tsx --tsconfig tsconfig.json my-file.ts
```

If you pass it at the end, it's silently ignored:

```
# Won't work
tsx my-file.ts --tsconfig tsconfig.json
```
