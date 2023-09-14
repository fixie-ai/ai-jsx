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
5. Call the start() method on the MicManager to begin capturing audio, along with a capture frame size
   in milliseconds. The default is 100, which all ASR services support, but applications that are
   especially latency-sensitive may want to use a smaller value, e.g. 20 ms, if they know that they
   are using an ASR service that supports that frame size. In addition, the smaller the frame size,
   the more responsive the ASR will be, but the more network traffic will be generated.
6. Call the start() method on the SpeechRecognition instance to connect to the ASR service and
   begin transcribing audio.
7. Call the close() method on the SpeechRecognition instance to disconnect from the ASR service and
   clean up resources.
8. Call the stop() method on the MicManager to stop capturing audio and clean up resources.

```
const micManager = new MicManager();
const asr = createSpeechRecognition({ provider: 'deepgram', manager: micManager, getToken });
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

The TTS client components are in the @ai-jsx/tts/tts package, and manage local audio playback as well as
communicating with the TTS provider. See the demo at nextjs-demo/src/app/tts.

To get started:

1. Create a TextToSpeech instance using the createTextToSpeech factory function, passing in the name
   of the desired TTS provider.
2. Call the play() method on the TextToSpeech instance, passing in the text to be spoken. You can
   call play() multiple times to stream text into the speech generator, and audio will be generated
   on demand once sufficient context has been established to determine the appropriate tone for the
   audio.
3. Once you have given all the input text to the TextToSpeech instance, call flush() to indicate that
   no more text will be forthcoming for this generation.
4. You can connect the onComplete callback to be notified when the audio has finished playing.
5. Call the stop() method to stop playback of any generated audio and clear any buffered data.
6. Call the close() method to disconnect from the TTS provider and clean up resources.

```
const tts = createTextToSpeech({ provider: 'aws', buildUrl });
tts.addEventListener('onComplete', () => {
  console.log('tts done');
});
tts.play('Hello');
tts.play(' World!');
tts.flush();
```
