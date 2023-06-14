# AI.JSX Hello World

This is a simple [AI.JSX](https://ai-jsx.com) project that demonstrates how to use the `ai-jsx`
package to create an AI-powered application.

This is meant to be as simple as possible, and as such the app here does not have any actual
UI -- it just writes its output (in the form of verbose logs) to the console.

## Building and running the app

The easiest way to get started is to create a sandbox on CodeSandbox using
[this template](https://codesandbox.io/p/sandbox/ai-jsx-hello-world-8683jx).

To run the app, configure your `OPENAI_API_KEY` environment variable in the CodeSandbox UI:

1. Navigate to the menu icon in the top left, choose **Project Settings**,
   then **Env Variables**.
1. Add a new variable with the name `OPENAI_API_KEY` and the value of your
   OpenAI API key, which you can obtain from the
   [OpenAI API dashboard](https://platform.openai.com/account/api-keys).
1. Save the variable and then click the prompt to restart the Sandbox VM instance, which allows
   the new environment variable to take effect.

CodeSandbox will build the app and run it, and in the `start:logs` tab you will
see output like:

```
Can one explore the vast history and culture of Ancient Egypt through books,
documentaries, and museum exhibits?
```
