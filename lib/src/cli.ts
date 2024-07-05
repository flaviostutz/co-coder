#!/usr/bin/env node
/* eslint-disable no-undefined */
/* eslint-disable no-console */

import path from 'path';

import yargs, { Argv } from 'yargs';
import openai, { OpenAI, AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

import { workspacePromptRunner } from './workspacePromptRunner';
import { WorkspacePromptRunnerArgs } from './types';
import { ProgressLogLevel } from './progressLog';
import { defaultValue, splitComma } from './utils';
import { cliOptions } from './cliOptions';

// Define the command line arguments
// eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-floating-promises
export const run = async (processArgs: string[]): Promise<number> => {
  // prepare cli arguments parser
  const yargs2 = yargs(processArgs.slice(2))
    .scriptName('co-coder')
    .command(
      'run',
      'Run a task in the context of workspace files and possibly generate new files based on the prompt',
      (y: Argv): Argv => cliOptions(y),
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

// eslint-disable-next-line complexity
function validateAndExpandDefaults(argv: { [x: string]: unknown }): WorkspacePromptRunnerArgs {
  // common options
  const baseDirArg = defaultValue(argv['base-dir'] as string, '.');
  const fullFiles = splitComma(defaultValue(argv.files as string, ''));
  const filesIgnore = splitComma(defaultValue(argv['files-ignore'] as string, ''));
  const useGitIgnore = defaultValue(argv['use-gitignore'] as boolean, true);

  const model = argv.model as openai.ChatModel;
  const apiProvider = defaultValue(argv['api-provider'] as string, 'openai');
  const apiURL = argv['api-url'] as string | undefined;
  const apiVersion = defaultValue(argv['api-azure-version'] as string, '2024-02-01');
  const apiKey = argv['api-key'] as string | undefined;
  const apiAuth = defaultValue(argv['api-auth'], 'apikey');

  const maxPrompts = defaultValue(argv['max-prompts'] as number, 20);
  const maxNumberOfRequestedFiles = defaultValue(argv['max-file-requests'] as number, 10);
  const maxFileSize = defaultValue(argv['max-file-size'] as number, 10000);
  const maxTokensTotal = defaultValue(argv['max-tokens-total'] as number, 6000);
  const maxTokensFiles = defaultValue(argv['max-tokens-files'] as number, 5000);
  const maxTokensPerRequest = defaultValue(argv['max-tokens-per-request'] as number, 128000);
  const outputDirArg = defaultValue(argv.output as string, '.out');
  const progressLogLevel = defaultValue(argv.log as ProgressLogLevel, 'info');

  const task = defaultValue(argv.task as string, '');
  const previewFiles = splitComma(defaultValue(argv.preview as string | undefined, undefined));
  const previewSize = defaultValue(argv['preview-size'] as number, 0);
  const projectInformation = defaultValue(argv.info as string | undefined, undefined);
  const example = defaultValue(argv.example, undefined) as string | undefined;

  const conversationFile = defaultValue(argv['conversation-file'] as string | undefined, undefined);
  const conversationSave = defaultValue(argv['conversation-save'] as boolean, true);

  // common checks
  if (!task) {
    throw new Error('"task" is required');
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

  if (!fullFiles) {
    throw new Error('"files" is required');
  }

  // convert relative paths to absolute
  let baseDir = baseDirArg;
  if (!path.isAbsolute(baseDir)) {
    baseDir = path.resolve(process.cwd(), baseDir);
  }
  let outputDir = outputDirArg;
  if (!path.isAbsolute(outputDir)) {
    outputDir = path.resolve(process.cwd(), outputDir);
  }

  if (progressLogLevel === 'debug') {
    console.log(`base-dir=${baseDir}`);
    console.log(`output-dir=${outputDir}`);
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

  const args: WorkspacePromptRunnerArgs = {
    promptGenerator: {
      task: task,
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
      maxNumberOfRequestedFiles,
    },
    outputDir,
    progressLogLevel,
    conversationFile,
    conversationSave,
    progressLogFunc: console.log,
  };

  return args;
}
