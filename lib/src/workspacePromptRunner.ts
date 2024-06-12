/* eslint-disable camelcase */
import path from 'path';
import fs from 'fs';

import openai from 'openai';

import { codePromptGenerator } from './codePromptGenerator';
import { parsePromptOutput } from './parsePromptOutput';
import { promptFileContents } from './promptFileContents';
import { createOpenAICompletionSession } from './openaiCompletionSession';
import { debug, info, trace } from './progressLog';
import { PromptProcessResult, SendAndProcessPromptArgs, WorkspacePromptRunnerArgs } from './types';

/**
 * Generate prompt based on workspace file, send it to OpenAI API, process its response (sometimes it will send additional files as requested by the model) and write any generated files to the output directory
 * @param args {WorkspacePromptRunnerArgs}
 */
export const workspacePromptRunner = async (
  args: WorkspacePromptRunnerArgs,
): Promise<PromptProcessResult> => {
  // generate the code prompt with workspace files
  debug(`Preparing workspace files...`, args.progressLogFunc, args.progressLogLevel);
  const prompt = codePromptGenerator(args.codePromptGeneratorArgs);
  info(
    `Full content files: ${prompt.fullFileContents?.filesProcessed.length}`,
    args.progressLogFunc,
    args.progressLogLevel,
  );

  if (prompt.fullFileContents && prompt.fullFileContents.filesTruncated.length > 0) {
    info(
      `  ${prompt.fullFileContents?.filesTruncated.length} truncated (max file size)`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    debug(
      `  ${prompt.fullFileContents?.filesTruncated.join('\n  ')}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
  }
  if (prompt.fullFileContents && prompt.fullFileContents.filesSkipped.length > 0) {
    info(
      `  ${prompt.fullFileContents?.filesTruncated.length} skipped (max token limit)`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
  }

  if (prompt.previewFileContents) {
    info(
      `Preview files: ${prompt.previewFileContents?.filesProcessed.length}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
  }

  const requestedFilesDir =
    args.codePromptGeneratorArgs.workspaceFiles.fullContents?.baseDir ||
    args.codePromptGeneratorArgs.workspaceFiles.previewContents?.baseDir;

  if (!requestedFilesDir) {
    throw new Error(
      'One of args.codePromptGeneratorArgs.workspaceFiles.fullContents or previewContents should be defined',
    );
  }

  return sendAndProcessWorkspacePrompt({
    prompt: prompt.codePrompt,
    requestedFilesDir,
    outputDir: args.outputDir,
    openAIClient: args.openAIClient,
    model: args.model,
    maxTokensPerRequest: args.maxTokensPerRequest,
    maxTokensTotal: args.maxTokensTotal,
    maxPrompts: args.maxPrompts,
    progressLogFunc: args.progressLogFunc,
    progressLogLevel: args.progressLogLevel,
    requestedFilesLimits: {
      maxFileSize: args.codePromptGeneratorArgs.workspaceFiles.fullContents?.maxFileSize,
      maxTokens: args.codePromptGeneratorArgs.workspaceFiles.fullContents?.maxTokens,
      ignoreFilePatterns:
        args.codePromptGeneratorArgs.workspaceFiles.fullContents?.ignoreFilePatterns,
    },
  });
};

/**
 * Send prompt to OpenAI API, process the input and create generated files on output dir
 * @param args {SendAndProcessPromptArgs}
 */
const sendAndProcessWorkspacePrompt = async (
  args: SendAndProcessPromptArgs,
  globalResult?: PromptProcessResult,
): Promise<PromptProcessResult> => {
  let selfOutput = globalResult;
  // initialize output on first call
  if (!selfOutput) {
    selfOutput = {
      generatedFiles: [],
      notes: [],
      stats: {
        promptCounter: 0,
        sessionInputTokens: 0,
        sessionOutputTokens: 0,
      },
    };
  }

  // track how many times additional files were requested
  let additionalFilesCounter = 0;

  let chatSession = args.openAICompletionSession;

  if (!chatSession) {
    chatSession = createOpenAICompletionSession(args.openAIClient, {
      openaiConfig: {
        temperature: 0, // make the output more deterministic amongst calls
        seed: 0, // make the output more deterministic amongst calls
        top_p: 0.95,
        model: args.model,
        max_tokens: 4096, // adding this setting made the model more stable in regard to not truncating the output
      },
      maxTokensPerRequest: args.maxTokensPerRequest,
      maxTokensTotal: args.maxTokensTotal,
      maxPrompts: args.maxPrompts,
    });
  }

  info('Sending prompt to model...', args.progressLogFunc, args.progressLogLevel);
  trace(
    `Prompt: 
${args.prompt}`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  const output = await chatSession.sendPrompt(args.prompt);

  trace(
    `Response:
${output.response}`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  info(
    `Model invoked (tokens: ${output.sessionInputTokens + output.sessionOutputTokens})`,
    args.progressLogFunc,
    args.progressLogLevel,
  );

  const promptOutput = parsePromptOutput(output.response);

  if (promptOutput.notes) {
    selfOutput.notes.push(...promptOutput.notes);
  }

  // CODE GENERATED
  if (promptOutput.outcome === 'codes-generated') {
    if (!promptOutput.files) {
      throw new Error('codes-generated outcome should have a file list');
    }
    const outputFiles = promptOutput.files;
    debug(`Saving files to ${args.outputDir}`);
    info(`Files generated: ${outputFiles.length}`, args.progressLogFunc, args.progressLogLevel);

    for (let i = 0; i < outputFiles.length; i += 1) {
      const file = outputFiles[i];
      const filePath = path.join(args.outputDir, file.filename);

      debug(`  ${file.filename}`);

      if (!file.contents) {
        throw new Error('File contents should not be empty');
      }

      // create folder if it doesn't exist
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // write file (replace if exists)
      fs.writeFileSync(filePath, file.contents);

      if (typeof selfOutput === 'undefined') {
        throw new Error('selfOutput shouldnt be undefined');
      }
      selfOutput.generatedFiles.push(filePath);
    }
    if (promptOutput.hasMoreToGenerate) {
      info(
        `Asking for additional files to be generated`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
      // request remaining files to be generated
      selfOutput = await sendAndProcessWorkspacePrompt(
        {
          ...args,
          openAICompletionSession: chatSession,
          prompt: 'generate additional source codes',
        },
        selfOutput,
      );
      return selfOutput;
    }

    // FILES REQUESTED
  } else if (promptOutput.outcome === 'files-requested') {
    if (!promptOutput.files) {
      throw new Error('files-requested outcome should have a file list');
    }

    info(
      `Additional files requested: ${promptOutput.files.length}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );

    let prompt = '';
    additionalFilesCounter += 1;
    if (additionalFilesCounter > (args.requestedFilesLimits.maxFileRequests || 2)) {
      info(
        `Max number of file requests reached, proceeding without additional files`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
    } else {
      const filePatterns = promptOutput.files
        .filter((file) => file.relevance && file.relevance >= 0.5)
        .map((file) => file.filename);

      const requestedFilesPrompt = promptFileContents({
        baseDir: args.requestedFilesDir,
        filePatterns,
        ...args.requestedFilesLimits,
      });

      info(
        `Additional files provided: ${requestedFilesPrompt.filesProcessed.length}`,
        args.progressLogFunc,
        args.progressLogLevel,
      );

      prompt = requestedFilesPrompt.fileContentsPrompt;
    }

    // if no files were provided or if the max number of requests were reached, proceed without additional files
    if (!prompt) {
      prompt = 'Proceed without additional files';
    }

    selfOutput = await sendAndProcessWorkspacePrompt(
      {
        ...args,
        openAICompletionSession: chatSession,
        prompt,
      },
      selfOutput,
    );
    return selfOutput;
  } else if (promptOutput.outcome !== 'notes-generated') {
    throw new Error(`Unexpected response from model: ${output.response}`);
  }

  const stats = chatSession.stats();
  selfOutput.stats = stats;

  info(`Workspace prompt completed`, args.progressLogFunc, args.progressLogLevel);
  debug(
    ` ${stats.promptCounter} api invocations
 ${stats.sessionInputTokens + stats.sessionInputTokens} tokens total (in: ${
      stats.sessionInputTokens
    }, out: ${stats.sessionOutputTokens})`,
    args.progressLogFunc,
    args.progressLogLevel,
  );
  info(
    estimatedCost(args.model, stats.sessionInputTokens, stats.sessionOutputTokens),
    args.progressLogFunc,
    args.progressLogLevel,
  );

  return selfOutput;
};

const costTable: { [model: string]: { in: number; out: number } } = {
  'gpt-4o': { in: 5 / 1000000, out: 15 / 1000000 },
  'gpt-4-turbo': { in: 10 / 1000000, out: 30 / 1000000 },
  'gpt-3.5-turbo-0125': { in: 0.5 / 1000000, out: 1.5 / 1000000 },
};

const estimatedCost = (model: openai.ChatModel, inTokens: number, outTokens: number): string => {
  const costs = costTable[model];
  if (costs) {
    const value = costs.in * inTokens + costs.out * outTokens;
    // round to 6 decimal places
    const valueStr = Math.round(value * 10 ** 6) / 10 ** 6;
    return `Estimated OpenAI cost: ${valueStr} USD`;
  }
  return '';
};
