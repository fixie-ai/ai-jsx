import { ChatCompletion, UserMessage } from 'ai-jsx/core/completion';
import { Image } from 'ai-jsx/core/image-gen';
import { showInspector } from 'ai-jsx/core/inspector';
import { OpenAI } from 'ai-jsx/lib/openai';

function App() {
  return (
    <OpenAI chatModel="gpt-4-turbo">
      <ChatCompletion>
        <UserMessage>
          What do the following images have in common?
          <Image url="https://upload.wikimedia.org/wikipedia/commons/8/89/Apollo_11_bootprint.jpg" detail="low" />
          <Image
            url="https://upload.wikimedia.org/wikipedia/commons/3/36/PIA00563-Viking1-FirstColorImage-19760721.jpg"
            detail="low"
          />
        </UserMessage>
      </ChatCompletion>
    </OpenAI>
  );
}

showInspector(<App />);
