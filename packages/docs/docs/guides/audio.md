# Audio Input and Output

AI.JSX includes components to simplify passing audio data in and out of a LLM.
On one side there is Automated Speech Recognition (ASR), and on the other there is Text-to-Speech (TTS).
By taking the output from ASR, passing it to the LLM as a UserMessage, and then handing the
AssistantMessage produced by the LLM, you can assemble a conversational audio agent.

## ASR

The ASR client components are in the @ai-jsx/asr/asr package, and manage local audio resources as well as
communicating with the ASR provider via a web socket. See the demo at nextjs-demo/src/app/asr.

To get started:

1. Create an instance of the MicManager class, which controls access to the local microphone.
2. Implement a function that returns the API token needed for your desired ASR provider.
   To keep this token secret, you'll want this function to call your server to get the token. However,
   for testing you can simply return your API key directly.
3. Create a SpeechRecognition instance using the createSpeechRecognition factory function,
   passing in the name of the desired ASR provider and the MicManager and token function you created above.
4. Connect an event listener to the 'transcript' event on the SpeechRecognition instance. When invoked,
   the listener will receive a CustomEvent with a Transcript detail object, in which the text property
   contains the transcribed text.
5. Start the MicManager to begin capturing audio.
6. Start the SpeechRecognition to begin transcribing audio.

```
const micManager = new MicManager();
const asr = createSpeechRecognition('deepgram', micManager, GetToken);
asr.addEventListener('transcript', (e) => {
  console.log(e.detail.text);
});
micManager.start();
asr.start();
```

Below are the ASR providers that are supported, along with the ids to pass to the createSpeechRecognition function:

- Deepgram (deepgram)
- AssemblyAI (aai)
- RevAI (revai)
- Speechmatics (speechmatics)
- Soniox (soniox)
- Gladia (gladia)

## TTS

TODO
