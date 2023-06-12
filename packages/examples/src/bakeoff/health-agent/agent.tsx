/**
 * Run this with `yarn demo:health-agent`
 */

import * as LLMx from '@fixieai/ai-jsx';
import { NaturalLanguageRouter, Route } from '@fixieai/ai-jsx/batteries/natural-language-router';
import fixtureUserData from './user-data.json';
import { ChatCompletion, SystemMessage, UserMessage } from '@fixieai/ai-jsx/core/completion';
import { loadJsonFile } from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface SleepQualityRatings {
  SleepEfficiency: 'Low' | 'Moderate' | 'High';
  DelayedSleepOnset: 'Low' | 'Moderate' | 'High';
  InsomniaRisk: 'Low' | 'Moderate' | 'High';
}

function computeSleepQualityRatings(userData: typeof fixtureUserData) {
  let se = 0; // Initialize the number of nights with Sleep Efficiency < 80%
  let sso = 0; // Initialize the number of nights with Sleep Onset Duration > 30 minutes
  const isi = userData.sleep_satisfaction + userData.daily_function; // Initialize the sum of sleep_satisfaction and daily_function

  for (const sleep_entry of userData.nightly_records) {
    const time_asleep = sleep_entry['Sleep Onset Duration (hrs)'] + sleep_entry['Wake Before Rise Time (hrs)'];
    const sleep_efficiency = Math.round(
      100 * sleep_entry['Total Time in Bed (hrs)'] - time_asleep / sleep_entry['Total Time in Bed (hrs)']
    );
    console.log(sleep_efficiency);
    const sleep_onset_duration = sleep_entry['Sleep Onset Duration (hrs)'];

    if (sleep_efficiency < 80) {
      se += 1;
    }

    if (sleep_onset_duration > 0.5) {
      sso += 1;
    }
  }

  let InsomniaRisk: 'Low' | 'High' | 'Moderate';
  if (isi > 6) {
    InsomniaRisk = 'Low';
  } else if (isi < 3) {
    InsomniaRisk = 'High';
  } else {
    InsomniaRisk = 'Moderate';
  }

  let SleepEfficiency: 'High' | 'Moderate' | 'Low';
  if (se <= 2) {
    SleepEfficiency = 'High';
  } else if (se <= 4) {
    SleepEfficiency = 'Moderate';
  } else {
    SleepEfficiency = 'Low';
  }

  let DelayedSleepOnset: 'Low' | 'High' | 'Moderate';
  if (sso <= 2) {
    DelayedSleepOnset = 'Low';
  } else if (sso <= 4) {
    DelayedSleepOnset = 'Moderate';
  } else {
    DelayedSleepOnset = 'High';
  }

  return {
    SleepEfficiency,
    DelayedSleepOnset,
    InsomniaRisk,
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

  if (sleepQualityRatings.InsomniaRisk === 'High') {
    return 'Congratulations, you are sleeping well!';
  }

  let advice = 'You are at ';
  advice += sleepQualityRatings.InsomniaRisk === 'Moderate' ? 'moderate' : 'high';
  advice += ' risk for insomnia. Consider trying the following to improve your sleep:\n';

  if (sleepQualityRatings.InsomniaRisk === 'Moderate') {
    advice += fallingAsleepAdvice;
  }

  if (sleepQualityRatings.DelayedSleepOnset === 'Moderate' || sleepQualityRatings.DelayedSleepOnset === 'High') {
    advice += adjustingBedTimeAdvice;
  }

  if (sleepQualityRatings.SleepEfficiency === 'Moderate' || sleepQualityRatings.SleepEfficiency === 'High') {
    advice += stayingAsleepAdvice;
  }

  return advice;
}

function loadUserData(): Promise<typeof fixtureUserData> {
  const currentPath = path.dirname(fileURLToPath(import.meta.url));
  return loadJsonFile(path.join(currentPath, 'user-data.json'));
}

async function getUserSleepAnalysis() {
  const userData = await loadUserData();
  return computeSleepQualityRatings(userData);
}

async function SleepQuality({ query }: { query: string }) {
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
        Here is some info about how to improve this user's sleep quality: {adviceText}
        Answer the user's question using the information above. If you can't answer it based only on this provided
        information, then apologize and say you're not able to help.
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

function RepeatAfterMe({ query }: { query: string }) {
  return (
    <ChatCompletion>
      <SystemMessage>Repeat the user message exactly as provided without quotation marks</SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

async function SleepData({ query }: { query: string }) {
  const user_data = await loadUserData();

  return (
    <ChatCompletion>
      <SystemMessage>Display relevant JSON data as a table then respond to the user question.</SystemMessage>
      <UserMessage>
        Here is the user question: {query}
        {'\n'} Here is the JSON data: {JSON.stringify(user_data.nightly_records)}
      </UserMessage>
    </ChatCompletion>
  );
}

export default function HealthAgent({ query }: { query: string }) {
  return (
    // The routing agent doesn't universally pick the right thing, but I think we could solve that with prompt engineering.
    <NaturalLanguageRouter query={query}>
      <Route when="the user is asking a question about your capabilities">
        <RepeatAfterMe query="I can answer questions about your sleep history, I can identify possible sleep issues, and I can give personalized advice on ways to improve your sleep"></RepeatAfterMe>
      </Route>
      <Route when="the user wants to know how well they are sleeping and if they have any risks or pathologies">
        Route: Quality{'\n'}
        <SleepQuality query={query}></SleepQuality>
      </Route>
      <Route when="the user wants to analyze, summarize or visualize their sleep data">
        Route: Analyze{'\n'}
        <SleepData query={query}></SleepData>
      </Route>
      <Route when="the user wants advice or suggestions to improve their sleep">
        Route: Advice{'\n'}
        <ShowAdvice query={query}></ShowAdvice>
      </Route>
      <Route unmatched>
        <RepeatAfterMe query="I am not able to help with this request. Please ask a question about your sleep history, issues, or concerns that you may have"></RepeatAfterMe>
      </Route>
    </NaturalLanguageRouter>
  );
}
