#!/usr/bin/env node

/**
 * This is a command-line tool to interact with the Fixie platform.
 */

import { program } from 'commander';
import terminal from 'terminal-kit';
import open from 'open';
import { FixieClient } from './client.js';

const { terminal: term } = terminal;

program
  .name('fixie')
  .version('1.0.0')
  .description('A command-line client to the Fixie AI platform.')
  .option('-u, --url <string>', 'URL of the Fixie API endpoint', 'https://app.fixie.ai');

program.command('user').action(async () => {
  const client = await FixieClient.Create(program.opts().url);
  const userInfo = await client.userInfo();
  term('You are logged in as: \n').green(JSON.stringify(userInfo, null, 2));
});

const corpus = program.command('corpus').description('Corpus related commands');

corpus
  .command('list')
  .description('List all corpora.')
  .action(async () => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpora();
    term('Corpora: \n').green(JSON.stringify(result, null, 2));
  });

corpus
  .command('get <corpusId>')
  .description('Get information about a corpus.')
  .action(async (corpusId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpus(corpusId);
    term(`Corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

corpus
  .command('create [corpusName]')
  .description('Create a corpus.')
  .action(async (corpusName?: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.createCorpus(corpusName);
    term('Created corpus: \n').green(JSON.stringify(result, null, 2));
  });

corpus
  .command('query <corpusId> <query>')
  .description('Query a given corpus.')
  .action(async (corpusId: string, query: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.queryCorpus(corpusId, query);
    term('Query result: \n').green(JSON.stringify(result, null, 2));
  });

const sources = corpus.command('sources').description('Corpus source related commands');

sources
  .command('add <corpusId> <urlPattern>')
  .description('Add a source to a corpus.')
  .action(async (corpusId: string, urlPattern: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.addCorpusSource(corpusId, urlPattern);
    term(`Added source to corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

sources
  .command('list <corpusId>')
  .description('List sources of a corpus.')
  .action(async (corpusId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpusSources(corpusId);
    term(`Sources for corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

sources
  .command('get <corpusId> <sourceId>')
  .description('Get a source for a corpus.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpusSource(corpusId, sourceId);
    term(`Source [${sourceId}] for corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

sources
  .command('refresh <corpusId> <sourceId>')
  .description('Refresh a corpus source.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.refreshCorpusSource(corpusId, sourceId);
    term(`Refreshed source [${sourceId}] for corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

const jobs = sources.command('jobs').description('Job-related commands');

jobs
  .command('list <corpusId> <sourceId>')
  .description('List jobs for a given source.')
  .action(async (corpusId: string, sourceId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpusSourceJobs(corpusId, sourceId);
    term(`Jobs for source [${sourceId}] in corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

jobs
  .command('get <corpusId> <sourceId> <jobId>')
  .description('Get a job for a source.')
  .action(async (corpusId: string, sourceId: string, jobId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpusSourceJob(corpusId, sourceId, jobId);
    term(`Job [${jobId}] for source [${sourceId}] for corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

const docs = corpus.command('docs').description('Document-related commands');

docs
  .command('list <corpusId>')
  .description('List documents for a given corpus.')
  .action(async (corpusId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.listCorpusDocs(corpusId);
    term(`Docs for corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

jobs
  .command('get <corpusId> <docId>')
  .description('Get a document for a corpus.')
  .action(async (corpusId: string, docId: string) => {
    const client = await FixieClient.Create(program.opts().url);
    const result = await client.getCorpusDoc(corpusId, docId);
    term(`Document [${docId}] for corpus [${corpusId}]: \n`).green(JSON.stringify(result, null, 2));
  });

program.parse(process.argv);
