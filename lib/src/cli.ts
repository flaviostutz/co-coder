#!/usr/bin/env node
/* eslint-disable no-undefined */
/* eslint-disable no-console */

import path from 'path';

import yargs from 'yargs';
import openai, { OpenAI, AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

import { workspacePromptRunner } from './workspacePromptRunner';
import { WorkspacePromptRunnerArgs } from './types';
import { ProgressLogLevel } from './progressLog';
import { defaultValue, splitComma } from './utils';

// Define the command line arguments
// eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-floating-promises
export const run = async (processArgs: string[]): Promise<number> => {
  // prepare cli arguments parser
  const yargs2 = yargs(processArgs.slice(2))
    .scriptName('co-coder')
    .command(
      'run',
      'Run a task in the context of workspace files and possibly generate new files based on the prompt',
      () => {
        yargs
          .option('task', {
            alias: 't',
            describe: 'Task to be performed in the context of the workspace files',
            type: 'string',
            demandOption: false,
          })
          .option('workspace', {
            alias: 'w',
            describe: 'Base directory with workspace files',
            type: 'string',
            default: '.',
            demandOption: false,
          })
          .option('files', {
            alias: 'f',
            describe:
              'Blob patterns for file names that will have its full content included in the prompt. e.g. "src/**/*.ts,**/*.json"',
            type: 'string',
            demandOption: false,
          })
          .option('files-ignore', {
            alias: 'fi',
            describe:
              'Blob patterns for file names that will never be used. e.g "**/*.test.ts,**/*.md"',
            type: 'string',
            demandOption: false,
          })
          .option('use-gitignore', {
            alias: 'gi',
            describe: 'Ignore files that are in .gitignore',
            type: 'array',
            demandOption: false,
          })
          .option('preview', {
            alias: 'p',
            describe:
              'Blob patterns for file names that will have its partial content included in the prompt. e.g. "docs/**/*.md"',
            type: 'string',
            demandOption: false,
          })
          .option('preview-size', {
            alias: 'ps',
            describe:
              'Max size of contents for the preview files. If "0", only the file name will be included in the prompt',
            type: 'number',
            default: 0,
            demandOption: false,
          })
          .option('example', {
            alias: 'e',
            describe:
              'Instruction with an example of the task to be performed, or a path to a file that should be used as an example',
            type: 'string',
            demandOption: false,
          })
          .option('info', {
            alias: 'i',
            describe:
              'General information about the workspace structure, standards, and other relevant information to be included in the prompt',
            type: 'string',
            demandOption: false,
          })
          .option('model', {
            alias: 'm',
            describe:
              'Model to be used. e.g. "gpt-4o", "gpt-3.5-turbo-0125". If using Azure, must match the custom deployment name you chose for your model',
            type: 'string',
            demandOption: false,
          })
          .option('output', {
            alias: 'o',
            describe: 'Output directory for generated files by the prompt',
            type: 'string',
            default: '.out',
            demandOption: false,
          })
          .option('max-tokens-total', {
            alias: 'tt',
            describe: 'Max number of tokens allowed to be used in total for the task',
            type: 'string',
            default: '6000',
            demandOption: false,
          })
          .option('max-tokens-per-request', {
            alias: 'tr',
            describe: 'Max number of tokens to send to the API in a single request',
            type: 'string',
            default: '128000',
            demandOption: false,
          })
          .option('max-tokens-files', {
            alias: 'tf',
            describe: 'Max number of tokens to spend with sending files',
            type: 'string',
            default: '5000',
            demandOption: false,
          })
          .option('max-file-size', {
            alias: 'fs',
            describe: 'Max file size. Files larger than this will be truncated',
            type: 'string',
            default: '10000',
            demandOption: false,
          })
          .option('max-file-requests', {
            alias: 'fr',
            describe: 'Max number of times the model can request for additional files',
            type: 'number',
            default: 2,
            demandOption: false,
          })
          .option('max-prompts', {
            alias: 'pm',
            describe: 'Max number of prompt requests allowed to be sent to the model for the task',
            type: 'number',
            default: 20,
            demandOption: false,
          })
          .option('api-provider', {
            describe: 'API provider. One of "openai" or "azure"',
            type: 'string',
            default: 'openai',
            demandOption: false,
          })
          .option('api-url', {
            describe:
              'API url. e.g. "https://localhost:1234". If using Azure, it\'s required to use the endpoint URL from Azure',
            type: 'string',
            demandOption: false,
          })
          .option('api-auth', {
            describe: 'API auth method. One of "token" or "apikey"',
            type: 'string',
            default: 'apikey',
            demandOption: false,
          })
          .option('api-key', {
            describe: 'OpenAI API key',
            type: 'string',
            demandOption: false,
          })
          .option('api-azure-version', {
            describe: 'Azure API version. Required when using Azure provider',
            type: 'string',
            default: '2024-02-01',
            demandOption: false,
          })
          .option('log', {
            describe: 'Log level. One of "trace", "debug", "info", "off"',
            type: 'string',
            default: 'info',
            demandOption: false,
          });
      },
    )
    .help()
    .example(
      'co-coder run --task "fix any bugs in these files" --files "src/*.ts" --model "gpt-3.5-turbo-0125"',
      'Fix bugs in all typescript codes in the "src" directory',
    );

  // parse arguments
  const args2 = yargs2.parseSync();
  const action = <string>args2._[0];
  if (action !== 'run') {
    console.log(`${await yargs2.getHelp()}`);
    return 1;
  }

  // prepare parameters
  let params;
  try {
    params = validateAndExpandDefaults(args2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.log(err.message);
    return 1;
  }

  // run prompts
  const result = await workspacePromptRunner(params);

  // show results
  if (result.generatedFiles && result.generatedFiles.length === 0) {
    console.log('No files generated');
  } else {
    console.log(`${result.generatedFiles.length} files generated`);
  }
  if (result.notes && result.notes.length > 0) {
    console.log('Notes from model:');
    for (let i = 0; i < result.notes.length; i += 1) {
      const note = result.notes[i];
      console.log(` - ${note}`);
    }
  }

  return 0;
};

function validateAndExpandDefaults(argv: { [x: string]: unknown }): WorkspacePromptRunnerArgs {
  const baseDir = defaultValue(argv.workspace as string, '.');
  const fullFiles = splitComma(defaultValue(argv.files as string, ''));
  const previewFiles = splitComma(defaultValue(argv.preview as string | undefined, undefined));
  const filesIgnore = splitComma(defaultValue(argv['files-ignore'] as string, ''));
  const previewSize = defaultValue(argv['preview-size'] as number, 0);
  const useGitIgnore = defaultValue(argv['use-gitignore'] as boolean, true);

  const task = defaultValue(argv.task as string | undefined, undefined);
  const projectInformation = defaultValue(argv.info as string | undefined, undefined);
  const example = defaultValue(argv.example, undefined) as string | undefined;

  const model = argv.model as openai.ChatModel;
  const apiProvider = defaultValue(argv['api-provider'] as string, 'openai');
  const apiURL = argv['api-url'] as string | undefined;
  const apiVersion = defaultValue(argv['api-azure-version'] as string, '2024-02-01');
  const apiKey = argv['api-key'] as string | undefined;
  const apiAuth = defaultValue(argv['api-auth'], 'apikey');

  const maxPrompts = defaultValue(argv['max-prompts'] as number, 20);
  const maxFileRequests = defaultValue(argv['max-file-requests'] as number, 2);
  const maxFileSize = defaultValue(argv['max-file-size'] as number, 10000);
  const maxTokensTotal = defaultValue(argv['max-tokens-total'] as number, 6000);
  const maxTokensFiles = defaultValue(argv['max-tokens-files'] as number, 5000);
  const maxTokensPerRequest = defaultValue(argv['max-tokens-per-request'] as number, 128000);
  const outputDir = defaultValue(argv.output as string, '.out');
  const progressLogLevel = defaultValue(argv.log as ProgressLogLevel, 'info');

  if (!task) {
    throw new Error('"task" is required');
  }
  if (!fullFiles) {
    throw new Error('"files" is required');
  }
  if (!model) {
    throw new Error('"model" is required');
  }
  if (!apiProvider) {
    throw new Error('"api-provider" is required');
  }
  if (apiAuth === 'apikey') {
    if (!apiKey) {
      throw new Error('"api-key" is required when auth is "apikey"');
    }
  }

  // openai client
  let openAIClient;

  // Azure provider
  if (apiProvider === 'azure') {
    let azureADTokenProvider;

    const endpoint = argv['api-url'] as string;
    if (!endpoint) {
      throw new Error('"api-url" is required when provider is "azure"');
    }

    if (apiAuth === 'token') {
      azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://cognitiveservices.azure.com/.default',
      );
    }

    openAIClient = new AzureOpenAI({
      deployment: model,
      endpoint,
      apiVersion,
      apiKey,
      azureADTokenProvider,
    });

    // OpenAI provider
  } else if (apiProvider === 'openai') {
    if (!apiKey) {
      throw new Error('"api.apikey" is required when provider is "openai"');
    }
    openAIClient = new OpenAI({
      baseURL: apiURL,
      apiKey,
    });
  } else {
    throw new Error(`Invalid API provider: ${apiProvider}`);
  }

  let previewContents;
  if (previewFiles) {
    previewContents = {
      baseDir,
      filePatterns: previewFiles,
      useGitIgnore,
      ignoreFilePatterns: filesIgnore,
      maxFileSize: previewSize,
      maxTokens: maxTokensFiles,
    };
  }

  const args: WorkspacePromptRunnerArgs = {
    codePromptGeneratorArgs: {
      taskDescription: task,
      workspaceFiles: {
        fullContents: {
          baseDir,
          filePatterns: fullFiles,
          useGitIgnore,
          ignoreFilePatterns: filesIgnore,
          maxFileSize,
          maxTokens: maxTokensFiles,
        },
        previewContents,
      },
      example,
      projectInformation,
    },
    openAIClient,
    model,
    maxTokensTotal,
    maxTokensPerRequest,
    maxPrompts,
    requestedFilesLimits: {
      maxFileSize,
      maxTokens: maxTokensFiles,
      useGitIgnore,
      ignoreFilePatterns: filesIgnore,
      maxFileRequests,
    },
    outputDir: path.join(process.cwd(), outputDir),
    progressLogLevel,
    progressLogFunc: console.log,
  };

  return args;
}
