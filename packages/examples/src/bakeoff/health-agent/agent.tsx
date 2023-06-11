/**
 * Run this with `yarn demo:health-agent`
 */

import * as LLMx from '@fixieai/ai-jsx';
import { NaturalLanguageRouter, Route } from '@fixieai/ai-jsx/batteries/natural-language-router';
import { Tool, UseTools } from '@fixieai/ai-jsx/batteries/use-tools';
import fixtureUserData from './user-data.json';
import { ChatCompletion, SystemMessage, UserMessage } from '@fixieai/ai-jsx/core/completion';
import { loadJsonFile } from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

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

function loadUserData(): Promise<typeof fixtureUserData> {
  const currentPath = path.dirname(fileURLToPath(import.meta.url));
  return loadJsonFile(path.join(currentPath, 'user-data.json'));
}

async function getUserSleepAnalysis() {
  const userData = await loadUserData();
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

function generateChartFromTimeSeries(_args: { xLabels: string[]; yValues: number[] }) {
  return Promise.resolve('https://my-time-series-chart.com/asdfasdf');
}
function generateHistogram(_args: { values: number[] }) {
  return Promise.resolve('https://my-histogram.com/odp');
}

function ApologizeForBeingUnableToShowThisSummary({ query }: { query: string }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You're a summarizing agent. The user has asked for a summary, but you don't have the capability to produce the
        format they're looking for. Explain this and apologize.
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

async function ShowDataSummary({ query }: { query: string }) {
  const tools: Record<string, Tool> = {
    generateChartFromTimeSeries: {
      description: 'Generate a bar chart from a time series, given x labels and y values.',
      parameters: z.object({
        xLabels: z.array(z.string()),
        yValues: z.array(z.number()),
      }),
      func: generateChartFromTimeSeries,
    },
    generateHistogram: {
      description: 'Generate a histogram from a list of values.',
      parameters: z.object({
        values: z.array(z.number()),
      }),
      func: generateHistogram,
    },
  };

  const userData = await loadUserData();
  return (
    <NaturalLanguageRouter query={query}>
      <Route when="the user wants to see an output format that you're able to generate yourself">
        <ChatCompletion>
          <SystemMessage>
            You're an expert summarizing agent. Here is the data you summarize: {JSON.stringify(userData)}. When the
            user asks a question, provide a summary in the format they want.
          </SystemMessage>
          <UserMessage>{query}</UserMessage>
        </ChatCompletion>
      </Route>
      <Route when="the user wants to see a histogram or chart of their sleep data">
        <UseTools
          tools={tools}
          query={query}
          fallback={<ApologizeForBeingUnableToShowThisSummary query={query} />}
          userData={JSON.stringify(userData)}
        />
      </Route>
      <Route unmatched>
        <ApologizeForBeingUnableToShowThisSummary query={query} />
      </Route>
    </NaturalLanguageRouter>
  );
}

export default function HealthAgent({ query }: { query: string }) {
  return (
    // The routing agent doesn't universally pick the right thing, but I think we could solve that with prompt engineering.
    <NaturalLanguageRouter query={query}>
      <Route when="the user is asking a question about your capabilities">
        I can show you your sleep data, answer questions about your sleep data, assess your sleep quality based on your
        sleep data, and provide advice to improve your sleep based on your sleep quality. Sleep quality and advice are
        based only on ISI, SSO, and SE ratings.
      </Route>
      <Route when="the user wants advice about their sleep health">
        <ShowAdvice query={query} />
      </Route>
      <Route when="the user wants to see an aggregated summary of their sleep efficiency or sleep onset duration (e.g. a table, image, chart, graph, average, min, mean, max, variance, etc)">
        <ShowDataSummary query={query} />
      </Route>
      <Route when="the user wants to know the value of one of these sleep stats: ISI, SSO, or SE">
        <ShowStat query={query} />
      </Route>
      <Route unmatched>I can't help with that.</Route>
    </NaturalLanguageRouter>
  );
}
