# Design Ideas Scratchpad

## Dynamic Prompt Sizing

Maybe you have a prompt with various subpieces:

```tsx
<UserData />
<CorpusResults />
<FixedPrompt />
```

Imagine you want to use the entire context window, and the size returned by `UserData` and `CorpusResults` varies widely. It would be nice to dynamically resize them (e.g. if you don't have much user data, corpus results can expand more).

One way to do this might be to have the subcomponents be generators which can yield resizing instructions. From the caller:

```tsx
const userDataGenerator = getUserData();
let userData = userDataGenerator.next();
if (userData.length < 1000 && corpusResults.length < 1000) {
  // If they're both small, fetch more user data.
  userData = userDataGenerator.next('150%'); // one can imagine many different ways to specify the resizing factor
}
```

The implementation of `userData`:

```tsx
function* getUserData() {
  let results = /* ... */
  while (true) {
    // Give the results we have so far, and wait to see if the caller wants a resize
    const resizeFactor = yield results;

    // The caller asked for a resize, so upscale/downscale our new results accordingly
    results = resize(results, resizeFactor);
  }
}
```
