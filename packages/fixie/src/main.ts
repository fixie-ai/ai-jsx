#!/usr/bin/env node

/**
 * This is a command-line tool to interact with the Fixie platform.
 */

import { Command, Option, program } from 'commander';
import fs from 'fs';
import path from 'path';
import terminal from 'terminal-kit';
import { fileURLToPath } from 'url';
import { FixieAgent } from './agent.js';
import { AuthenticateOrLogIn, FIXIE_CONFIG_FILE, loadConfig } from './auth.js';
import { FixieClientError } from './client.js';

const [major] = process.version
  .slice(1)
  .split('.')
  .map((x) => parseInt(x));
if (major < 18) {
  console.error(`This CLI requires Node.js v18 or later. (Detected version ${process.version})`);
  process.exit(1);
}

const { terminal: term } = terminal;

/** Pretty-print a result as JSON. */
function showResult(result: any, raw: boolean) {
  if (raw) {
    console.log(JSON.stringify(result));
  } else {
    term.green(JSON.stringify(result, null, 2));
  }
}

/** Parse the provided value as a Date. */
function parseDate(value: string): Date {
  const parsedDate = new Date(value);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date format.');
  }
  return parsedDate;
}

/** Deploy an agent from the current directory. */
function registerDeployCommand(command: Command) {
  command
    .command('deploy [path]')
    .description('Deploy an agent')
    .option(
      '-e, --env <key=value>',
      'Environment variables to set for this deployment. Variables in a .env file take precedence over those on the command line.',
      (v, m: Record<string, string> | undefined) => {
        const [key, value] = v.split('=');
        return {
          ...m,
          // This condition is necessary; the types are wrong.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          [key]: value ?? '',
        };
      }
    )
    .action(async (path: string | undefined, options: { env: Record<string, string> }) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      await FixieAgent.DeployAgent(client, path ?? process.cwd(), {
        FIXIE_API_URL: program.opts().url,
        ...options.env,
      });
    });
}

/** Run an agent locally. */
function registerServeCommand(command: Command) {
  command
    .command('serve [path]')
    .description('Run an agent locally')
    .option('-p, --port <number>', 'Port to run the agent on', '8181')
    .option(
      '-e, --env <key=value>',
      'Environment variables to set for this agent. Variables in a .env file take precedence over those on the command line.',
      (v, m: Record<string, string> | undefined) => {
        const [key, value] = v.split('=');
        return {
          ...m,
          // This condition is necessary; the types are wrong.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          [key]: value ?? '',
        };
      }
    )
    .action(async (path: string | undefined, options: { port: string; env: Record<string, string> }) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      await FixieAgent.ServeAgent({
        client,
        agentPath: path ?? process.cwd(),
        port: parseInt(options.port),
        tunnel: true,
        environmentVariables: {
          FIXIE_API_URL: program.opts().url,
          ...options.env,
        },
      });
    });
}

// Get current version of this package.
const currentPath = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(currentPath, path.join('..', 'package.json'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

function errorHandler(error: any) {
  if (error instanceof FixieClientError) {
    // Error from a REST API call.
    const url = error.url;
    if (error.statusCode == 401) {
      term('❌ Could not authenticate to the Fixie API at ').green(`${url}\n`);
      if (process.env.FIXIE_API_URL) {
        term('Your ').green('FIXIE_API_URL')(' is set to ').green(process.env.FIXIE_API_URL)('\n');
        term('Check to ensure that this is the correct API endpoint.\n');
      }
      if (process.env.FIXIE_API_KEY) {
        term('Your ').green('FIXIE_API_KEY')(' is set to ').green(process.env.FIXIE_API_KEY.slice(0, 12))('...\n');
        term('Check to ensure that this is the correct key.\n');
      }
    } else if (error.statusCode == 400) {
      term('❌ Client made bad request to ').green(`${url}\n`);
      term('Please check that you are running the latest version using ').green('npx fixie@latest -V')('\n');
      term('The version of this CLI is: ').green(packageJson.version)('\n');
    } else if (error.statusCode == 403) {
      term('❌ Forbidden: ').green(`${url}\n`);
    } else if (error.statusCode == 404) {
      term('❌ Not found: ').green(`${url}\n`);
    } else {
      term('❌ Error accessing Fixie API at ').green(url)(': ')(error.message)('\n');
    }
    term.green(JSON.stringify(error.detail, null, 2));
  } else {
    term('❌ Error: ')(error.message)('\n');
    term.red(error.stack)('\n');
  }
}

function catchErrors(fn: (...args: any[]) => Promise<any>) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err) {
      errorHandler(err);
    }
  };
}

program
  .name('fixie')
  .version(packageJson.version)
  .description('A command-line client to the Fixie AI platform.')
  .option('-u, --url <string>', 'URL of the Fixie API endpoint', process.env.FIXIE_API_URL ?? 'https://api.fixie.ai')
  .option('-r --raw', 'Output raw JSON instead of pretty-printing.');

registerDeployCommand(program);
registerServeCommand(program);

const user = program.command('user').description('User related commands');

user
  .command('get')
  .description('Get information on the current user')
  .action(
    catchErrors(async () => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.userInfo();
      showResult(result, program.opts().raw);
    })
  );

user
  .command('update')
  .description('Update information on the current user')
  .option('--email <string>', 'The new email address for this user')
  .option('--fullName <string>', 'The new full name for this user')
  .action(
    catchErrors(async (opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.updateUser({ email: opts.email, fullName: opts.fullName });
      showResult(result, program.opts().raw);
    })
  );

program
  .command('auth')
  .description('Authenticate to the Fixie service')
  .option('--force', 'Force reauthentication.')
  .option('--show-key', 'Show Fixie API key in full.')
  .action(
    catchErrors(async (options: { force?: boolean; showKey?: boolean }) => {
      const client = await AuthenticateOrLogIn({ forceReauth: options.force ?? false });
      const userInfo = await client.userInfo();
      term('👤 You are logged into ').green(client.url)(' as ').green(userInfo.email)('\n');
      if (options.showKey) {
        term('🔑 Your FIXIE_API_KEY is: ').red(client.apiKey)('\n');
      } else {
        // Truncate the key.
        term('🔑 Your FIXIE_API_KEY is: ').red(`${client.apiKey?.slice(0, 12)}...`)('\n');
      }
    })
  );

const config = program.command('config').description('Configuration related commands');
config
  .command('show')
  .description('Show current config.')
  .action(
    // eslint-disable-next-line
    catchErrors(async () => {
      const config = loadConfig(FIXIE_CONFIG_FILE);
      showResult(config, program.opts().raw);
    })
  );

const corpus = program.command('corpus').description('Corpus related commands');
corpus.alias('corpora');

corpus
  .command('list')
  .description('List corpora.')
  .option(
    '--teamId <string>',
    "The team ID to list corpora for. If unspecified, the current user's corpora will be listed."
  )
  .option('--offset <number>', 'Start offset for results to return')
  .option('--limit <number>', 'Limit on the number of results to return')
  .action(
    catchErrors(async (opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.listCorpora({ teamId: opts.teamId, offset: opts.offset, limit: opts.limit });
      showResult(result, program.opts().raw);
    })
  );

corpus
  .command('get <corpusId>')
  .description('Get information about a corpus.')
  .action(
    catchErrors(async (corpusId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.getCorpus(corpusId);
      showResult(result, program.opts().raw);
    })
  );

corpus
  .command('create')
  .description('Create a corpus.')
  .option('--name <string>', 'The display name for this corpus')
  .option('--description <string>', 'The description for this corpus')
  .option('--teamId <string>', 'The team ID to own the new Corpus. If unspecified, the current user will own it.')
  .action(
    catchErrors(async (opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.createCorpus({
        name: opts.name,
        description: opts.description,
        teamId: opts?.teamId,
      });
      showResult(result, program.opts().raw);
    })
  );

corpus
  .command('update <corpusId>')
  .description('Update corpus metadata.')
  .option('--name <string>', 'The new display name for this corpus')
  .option('--description <string>', 'The new description for this corpus')
  .action(
    catchErrors(async (corpusId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.updateCorpus({
        corpusId,
        displayName: opts.name ?? undefined,
        description: opts.description ?? undefined,
      });
      showResult(result, program.opts().raw);
    })
  );

corpus
  .command('delete <corpusId>')
  .description('Delete a corpus.')
  .action(
    catchErrors(async (corpusId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.deleteCorpus({ corpusId });
      showResult(result, program.opts().raw);
    })
  );

corpus
  .command('query <corpusId> <query>')
  .description('Query a given corpus.')
  .action(
    catchErrors(async (corpusId: string, query: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.queryCorpus({ corpusId, query });
      showResult(result, program.opts().raw);
    })
  );

const source = corpus.command('source').description('Corpus source related commands');
source.alias('sources');

source
  .command('add <corpusId> <startUrls...>')
  .description('Add a web source to a corpus.')
  .option('--description <string>', 'A human-readable description for the source')
  .option('--max-documents <number>', 'Maximum number of documents to crawl')
  .option('--max-depth <number>', 'Maximum depth to crawl')
  .option('--include-patterns <pattern...>', 'URL patterns to include in the crawl')
  .option('--exclude-patterns <pattern...>', 'URL patterns to exclude from the crawl')
  .action(
    catchErrors(
      async (
        corpusId: string,
        startUrls: string[],
        {
          maxDocuments,
          maxDepth,
          includePatterns,
          excludePatterns,
          description,
        }: {
          maxDocuments?: number;
          maxDepth?: number;
          includePatterns?: string[];
          excludePatterns?: string[];
          description: string;
        }
      ) => {
        if (!includePatterns) {
          term.yellow('Warning: ')(
            'No --include-patterns specfied. This is equivalent to only crawling the URLs specified as startUrls.\n'
          );
          term.yellow('Warning: ')('Use ').red("--include-patterns '*'")(
            ' if you want to allow all URLs in the crawl.\n'
          );
        }
        const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
        const result = await client.addCorpusSource({
          corpusId,
          startUrls,
          includeGlobs: includePatterns,
          excludeGlobs: excludePatterns,
          maxDocuments,
          maxDepth,
          description,
        });
        showResult(result, program.opts().raw);
      }
    )
  );

source
  .command('upload <corpusId> <mimeType> <filenames...>')
  .description('Upload local files to a corpus.')
  .action(
    catchErrors(async (corpusId: string, mimeType: string, filenames: string[]) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.addCorpusFileSource({
        corpusId,
        files: filenames.map((file) => ({
          filename: path.resolve(file),
          contents: new Blob([fs.readFileSync(path.resolve(file))]),
          mimeType,
        })),
      });
      showResult(result, program.opts().raw);
    })
  );

source
  .command('list <corpusId>')
  .description('List sources of a corpus.')
  .option('--offset <number>', 'Start offset for results to return')
  .option('--limit <number>', 'Limit on the number of results to return')
  .action(
    catchErrors(async (corpusId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.listCorpusSources({ corpusId, offset: opts.offset, limit: opts.limit });
      showResult(result, program.opts().raw);
    })
  );

source
  .command('get <corpusId> <sourceId>')
  .description('Get a source for a corpus.')
  .action(
    catchErrors(async (corpusId: string, sourceId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.getCorpusSource({ corpusId, sourceId });
      showResult(result, program.opts().raw);
    })
  );

source
  .command('update <corpusId> <sourceId>')
  .description('Update source metadata.')
  .option('--name <string>', 'The new display name for this source')
  .option('--description <string>', 'The new description for this source')
  .action(
    catchErrors(async (corpusId: string, sourceId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.updateCorpusSource({
        corpusId,
        sourceId,
        displayName: opts.name ?? undefined,
        description: opts.description ?? undefined,
      });
      showResult(result, program.opts().raw);
    })
  );

source
  .command('delete <corpusId> <sourceId>')
  .description('Delete a source from a corpus. The source must have no running jobs or remaining documents.')
  .action(
    catchErrors(async (corpusId: string, sourceId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.deleteCorpusSource({ corpusId, sourceId });
      showResult(result, program.opts().raw);
    })
  );

source
  .command('refresh <corpusId> <sourceId>')
  .description('Refresh a corpus source.')
  .option(
    '--force',
    'By default, this command will fail if you try to refresh a source that currently has a job running. If you want to refresh the source regardless, pass this flag.'
  )
  .action(
    catchErrors(async (corpusId: string, sourceId: string, { force }) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.refreshCorpusSource({ corpusId, sourceId, force });
      showResult(result, program.opts().raw);
    })
  );

source
  .command('clear <corpusId> <sourceId>')
  .description('Clear a corpus source.')
  .option(
    '--force',
    'By default, this command will fail if you try to clear a source that currently has a job running. If you want to clear the source regardless, pass this flag.'
  )
  .action(
    catchErrors(async (corpusId: string, sourceId: string, { force }) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.clearCorpusSource({ corpusId, sourceId, force });
      showResult(result, program.opts().raw);
    })
  );

const job = source.command('job').description('Job-related commands');
job.alias('jobs');

job
  .command('list <corpusId> <sourceId>')
  .description('List jobs for a given source.')
  .option('--offset <number>', 'Start offset for results to return')
  .option('--limit <number>', 'Limit on the number of results to return')
  .action(
    catchErrors(async (corpusId: string, sourceId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.listCorpusSourceJobs({ corpusId, sourceId, offset: opts.offset, limit: opts.limit });
      showResult(result, program.opts().raw);
    })
  );

job
  .command('get <corpusId> <sourceId> <jobId>')
  .description('Get a job for a source.')
  .action(
    catchErrors(async (corpusId: string, sourceId: string, jobId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.getCorpusSourceJob({ corpusId, sourceId, jobId });
      showResult(result, program.opts().raw);
    })
  );

const doc = source.command('doc').description('Document-related commands');
doc.alias('docs');

doc
  .command('list <corpusId> <sourceId>')
  .description('List documents for a given corpus source.')
  .option('--offset <number>', 'Start offset for results to return')
  .option('--limit <number>', 'Limit on the number of results to return')
  .action(
    catchErrors(async (corpusId: string, sourceId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.listCorpusSourceDocuments({
        corpusId,
        sourceId,
        offset: opts.offset,
        limit: opts.limit,
      });
      showResult(result, program.opts().raw);
    })
  );

doc
  .command('get <corpusId> <sourceId> <documentId>')
  .description('Get a document from a corpus source.')
  .action(
    catchErrors(async (corpusId: string, sourceId: string, documentId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.getCorpusSourceDocument({ corpusId, sourceId, documentId });
      showResult(result, program.opts().raw);
    })
  );

const agent = program.command('agent').description('Agent related commands');
agent.alias('agents');

agent
  .command('list')
  .description('List all agents.')
  .option('--teamId <string>', 'The team ID to list agents for. If unspecified, the current user will be used.')
  .action(
    catchErrors(async () => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await FixieAgent.ListAgents(client);
      showResult(await Promise.all(result.map((agent) => agent.metadata)), program.opts().raw);
    })
  );

agent
  .command('get <agentId>')
  .description('Get information about the given agent.')
  .action(
    catchErrors(async (agentId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      try {
        const result = await FixieAgent.GetAgent({ client, agentId });
        showResult(result.metadata, program.opts().raw);
      } catch (e) {
        // Try again with the agent handle.
        const result = await FixieAgent.GetAgent({ client, handle: agentId });
        showResult(result.metadata, program.opts().raw);
      }
    })
  );

agent
  .command('delete <agentHandle>')
  .description('Delete the given agent.')
  .action(
    catchErrors(async (agentHandle: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const agent = await FixieAgent.GetAgent({ client, handle: agentHandle });
      const result = agent.delete();
      showResult(result, program.opts().raw);
    })
  );

agent
  .command('publish <agentId>')
  .description('Publish the given agent.')
  .action(
    catchErrors(async (agentHandle: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const agent = await FixieAgent.GetAgent({ client, handle: agentHandle });
      const result = agent.update({ published: true });
      showResult(result, program.opts().raw);
    })
  );

agent
  .command('unpublish <agentId>')
  .description('Unpublish the given agent.')
  .action(
    catchErrors(async (agentHandle: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const agent = await FixieAgent.GetAgent({ client, handle: agentHandle });
      const result = agent.update({ published: false });
      showResult(result, program.opts().raw);
    })
  );

agent
  .command('create <agentHandle>')
  .description('Create an agent.')
  .option('--name <string>', 'Agent name')
  .option('--description <string>', 'Agent description')
  .option('--url <string>', 'More info URL for agent')
  .option('--teamId <string>', 'Team ID to own the new agent. If not specified, the current user will own it.')
  .action(
    catchErrors(async (agentHandle: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await FixieAgent.CreateAgent({
        client,
        handle: agentHandle,
        teamId: opts.teamId,
        name: opts.name,
        description: opts.description,
        moreInfoUrl: opts.url,
      });
      showResult(result.metadata, program.opts().raw);
    })
  );

agent
  .command('logs <agentId>')
  .description('Fetch agent logs.')
  .option('--start <date>', 'Start date', parseDate)
  .option('--end <date>', 'End date', parseDate)
  .option('--limit <number>', 'Max number of results to return')
  .option('--offset <number>', 'Starting offset of results to return')
  .option('--minSeverity <number>', 'Minimum log severity level')
  .option('--conversation <string>', 'Conversation ID of logs to return')
  .option('--message <string>', 'Message ID of logs to return')
  .action(
    catchErrors(async (agentId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await FixieAgent.GetAgent({ client, agentId });
      showResult(
        await result.getLogs({
          start: opts.start,
          end: opts.end,
          limit: opts.limit,
          offset: opts.offset,
          minSeverity: opts.minSeverity,
          conversationId: opts.conversation,
          messageId: opts.message,
        }),
        program.opts().raw
      );
    })
  );

registerDeployCommand(agent);
registerServeCommand(agent);

const revision = agent.command('revision').description('Agent revision-related commands');
revision.alias('revisions');

revision
  .command('list <agentId>')
  .description('List all revisions for the given agent.')
  .action(
    catchErrors(async (agentId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = (await FixieAgent.GetAgent({ client, agentId })).metadata.allRevisions;
      showResult(result, program.opts().raw);
    })
  );

revision
  .command('get <agentId>')
  .description('Get current revision for the given agent.')
  .action(
    catchErrors(async (agentId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const agent = await FixieAgent.GetAgent({ client, agentId });
      const result = await agent.getCurrentRevision();
      showResult(result, program.opts().raw);
    })
  );

revision
  .command('set <agentId> <revisionId>')
  .description('Set the current revision for the given agent.')
  .action(
    catchErrors(async (agentId: string, revisionId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const agent = await FixieAgent.GetAgent({ client, agentId });
      const result = await agent.setCurrentRevision(revisionId);
      showResult(result, program.opts().raw);
    })
  );

revision
  .command('delete <agentId> <revisionId>')
  .description('Delete the given revision for the given agent.')
  .action(
    catchErrors(async (agentId: string, revisionId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const agent = await FixieAgent.GetAgent({ client, agentId });
      const result = await agent.deleteRevision(revisionId);
      showResult(result, program.opts().raw);
    })
  );

const team = program.command('team').description('Team related commands');
team.alias('teams');

team
  .command('list')
  .description('List teams')
  .option('--offset <number>', 'Start offset for results to return')
  .option('--limit <number>', 'Limit on the number of results to return')
  .action(
    catchErrors(async (opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.listTeams({ offset: opts.offset, limit: opts.limit });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('get <teamId>')
  .description('Get information about a team')
  .action(
    catchErrors(async (teamId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.getTeam({ teamId });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('delete <teamId>')
  .description('Delete the given team')
  .action(
    catchErrors(async (teamId: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.deleteTeam({ teamId });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('invite <teamId> <email>')
  .description('Invite a new member to a team')
  .option('--admin', 'Invite the new member as a team admin')
  .action(
    catchErrors(async (teamId: string, email: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.inviteTeamMember({
        teamId,
        email,
        isAdmin: opts.admin,
      });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('uninvite <teamId> <email>')
  .description('Cancel a pending invitation for a team membership')
  .action(
    catchErrors(async (teamId: string, email: string) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.cancelInvitation({
        teamId,
        email,
      });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('remove <teamId> <userId>')
  .description('Remove a member from a team')
  .action(
    catchErrors(async (teamId: string, userId: string, opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.removeTeamMember({
        teamId,
        userId,
      });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('update <teamId> <userId>')
  .description('Set or clear admin role for a member of a team')
  .option('--admin', 'Set member as team admin')
  .option('--no-admin', 'Unset member as team admin')
  .action(
    catchErrors(async (teamId: string, userId: string, opts) => {
      if (opts.admin === undefined) {
        throw new Error('Must specify --admin or --no-admin');
      }
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.updateTeamMember({
        teamId,
        userId,
        isAdmin: opts.admin ?? false,
      });
      showResult(result, program.opts().raw);
    })
  );

team
  .command('create')
  .description('Create a new team')
  .option('--name <string>', 'The name of the team to create')
  .option('--description <string>', 'The description for this team')
  .action(
    catchErrors(async (opts) => {
      const client = await AuthenticateOrLogIn({ apiUrl: program.opts().url });
      const result = await client.createTeam({
        displayName: opts.name,
        description: opts.description,
      });
      showResult(result, program.opts().raw);
    })
  );

program.parse(process.argv);
