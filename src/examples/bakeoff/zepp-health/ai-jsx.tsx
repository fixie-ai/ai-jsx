import { LLMx } from '../../../lib/index.ts';
import { showInspector } from '../../../inspector/console.tsx';
import { NaturalLanguageRouter, Route } from '../../../lib/natural-language-router.tsx';
import { UseTools } from '../../../lib/use-tools.tsx';
import fixtureUserData from './user-data.json';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../lib/completion-components.tsx';
import { loadJsonFile } from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface SleepQualityRatings {
  SE: 'Low' | 'Moderate' | 'High';
  SSO: 'Low' | 'Moderate' | 'High';
  ISI: 'Low' | 'Moderate' | 'High';
}

function computeSleepQualityRatings(userData: typeof fixtureUserData) {
  let se = 0; // Initialize the number of nights with Sleep Efficiency < 80%
  let sso = 0; // Initialize the number of nights with Sleep Onset Duration > 30 minutes
  const isi = userData.sleep_satisfaction + userData.daily_function; // Initialize the sum of sleep_satisfaction and daily_function

  for (const sleep_entry of userData.nightly_records) {
    const sleep_efficiency = sleep_entry['Sleep Efficiency (%)'];
    const sleep_onset_duration = sleep_entry['Sleep Onset Duration (hrs)'];

    if (sleep_efficiency < 80) {
      se += 1;
    }

    if (sleep_onset_duration > 0.5) {
      sso += 1;
    }
  }

  let ISI: 'Low' | 'High' | 'Moderate';
  if (isi > 6) {
    ISI = 'Low';
  } else if (isi < 3) {
    ISI = 'High';
  } else {
    ISI = 'Moderate';
  }

  let SE: 'High' | 'Moderate' | 'Low';
  if (se <= 2) {
    SE = 'High';
  } else if (se <= 4) {
    SE = 'Moderate';
  } else {
    SE = 'Low';
  }

  let SSO: 'Low' | 'High' | 'Moderate';
  if (sso <= 2) {
    SSO = 'Low';
  } else if (sso <= 4) {
    SSO = 'Moderate';
  } else {
    SSO = 'High';
  }

  return {
    SE,
    SSO,
    ISI,
  };
}

function getAdvisorText(sleepQualityRatings: SleepQualityRatings): string {
  const fallingAsleepAdvice = `
    (1) limit the amount of time you spend trying to sleep by going to bed a
    little later, closer to when you are falling asleep;
    (2) if you cannot fall asleep in about 15-20 minutes, get out of bed and
    engage in a quiet, screen-free activity in dim light until you start to feel
    sleepy;
  `;

  const stayingAsleepAdvice = `
    if you have trouble falling asleep at bedtime or wake up during the night
    and cannot return to sleep after about 15-20 minutes, get out of bed and
    engage in a quiet, screen-free activity in dim light until you start to feel
    sleepy;
  `;

  const adjustingBedTimeAdvice = `
    limit the amount of time you spend trying to sleep by going to bed a
    little later, closer to when you are falling asleep or making sure that you
    get out of bed shortly after waking in the morning;
  `;

  if (sleepQualityRatings.ISI === 'High') {
    return 'Congratulations, you are sleeping well!';
  }

  let advice = 'You are at ';
  advice += sleepQualityRatings.ISI === 'Moderate' ? 'moderate' : 'high';
  advice += ' risk for insomnia. Consider trying the following to improve your sleep:\n';

  if (sleepQualityRatings.ISI === 'Moderate') {
    advice += fallingAsleepAdvice;
  }

  if (sleepQualityRatings.SSO === 'Moderate' || sleepQualityRatings.SSO === 'High') {
    advice += adjustingBedTimeAdvice;
  }

  if (sleepQualityRatings.SE === 'Moderate' || sleepQualityRatings.SE === 'High') {
    advice += stayingAsleepAdvice;
  }

  return advice;
}

async function getUserSleepAnalysis() {
  const currentPath = path.dirname(fileURLToPath(import.meta.url));
  const userData = (await loadJsonFile(path.join(currentPath, 'user-data.json'))) as typeof fixtureUserData;
  return computeSleepQualityRatings(userData);
}

async function ShowStat({ query }: { query: string }) {
  // In the LangChain example, this was a Tool that the LLM decided to invoke. We don't need that here;
  // the decision has already been made by the router.

  const analysis = await getUserSleepAnalysis();
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert sleep analyst. Here is some data about the user's sleep quality: {JSON.stringify(analysis)}
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

async function ShowAdvice({ query }: { query: string }) {
  const analysis = await getUserSleepAnalysis();
  const adviceText = getAdvisorText(analysis);

  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert sleep analyst. Here is some data about the user's sleep quality: {JSON.stringify(analysis)}
        Here is some info you know about how to improve this user's sleep quality: {adviceText}
        Answer the user's question using the information above. If you can't answer it, apologize and say you're not
        able to help.
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

function ZeppHealth({ query }: { query: string }) {
  return (
    <NaturalLanguageRouter query={query}>
      <Route when="the user wants to know what you can do">
        I can show you your sleep data, answer questions about your sleep data, assess your sleep quality based on your
        sleep data, and provide advice to improve your sleep based on your sleep quality. Sleep quality and advice are
        based only on ISI, SSO, and SE ratings.
      </Route>
      {/* TODO: list which stats are specifically supported. */}
      <Route when="the user wants to know a specific stat about their sleep (ISI, SSO, or SE)">
        <ShowStat query={query} />
      </Route>
      <Route when="the user wants advice about their sleep health">
        <ShowAdvice query={query} />
      </Route>
      <Route when="the user wants to see a summary of their sleep data">here is your summary</Route>
      <Route unmatched>I can't help with that.</Route>
    </NaturalLanguageRouter>
  );
}

function AskAndAnswer({ query }: { query: string }) {
  return (
    <>
      {query}
      {'\n'}
      <ZeppHealth query={query} />
      {'\n'}
      {'\n'}
    </>
  );
}

// It could be interesting to play around with an Eval component to evaluate responses.

showInspector(
  <>
    {/* <AskAndAnswer query="Please give me a recipe for cake" />
    <AskAndAnswer query="What does anthrax taste like?" />
    <AskAndAnswer query="What can you do?" />
    <AskAndAnswer query="How can you help me?" /> */}
    <AskAndAnswer query="Can you provide me with information about my sleep quality ratings?" />
    {/* <AskAndAnswer query="What's my ISI rating?" />
    <AskAndAnswer query="What's my SSO rating?" />
    <AskAndAnswer query="What's my SE rating?" /> */}
    {/* <AskAndAnswer query="How can I get to sleep faster?" /> */}
    {/* <AskAndAnswer query="Show me my sleep data as a markdown table" />
    <AskAndAnswer query="Show me a chart about my sleep data" /> */}

    {/* <AskAndAnswer query="What's my DOESNOTEXIST rating?" /> */}
  </>,
  { showDebugTree: true }
);
