/* eslint-disable camelcase */
/* eslint-disable complexity */
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

import openai from 'openai';

import { PromptResponse, parsePromptResponse } from './parsePromptResponse';
import { debug, info, trace } from './progressLog';
import { promptFileContents } from './promptFileContents';
import { SendAndProcessPromptArgs, PromptProcessResult } from './types';
import { defaultValue } from './utils';

/**
 * Send prompt to OpenAI API, process the input and create generated files on output dir
 * @param args {SendAndProcessPromptArgs}
 */
export const sendAndProcessWorkspacePrompt = async (
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
      totalRequestedFiles: 0,
    };
  }

  const chatSession = args.openAICompletionSession;

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
    `Model invoked (tokens: in=${output.sessionInputTokens}; out=${output.sessionOutputTokens})`,
    args.progressLogFunc,
    args.progressLogLevel,
  );

  let promptOutput: PromptResponse;
  try {
    promptOutput = parsePromptResponse(output.response);
  } catch (err) {
    debug(
      `Model response could not be parsed. Creating note with response contents`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    promptOutput = {
      header: { count: 1, outcome: 'notes-generated' },
      contents: [
        {
          filename: 'notes.txt',
          size: output.response.length,
          md5: crypto.createHash('md5').update(output.response).digest('hex'),
          md5OK: true,
          relevance: 10,
          motivation: 'content body',
          content: `Model response: ${output.response}`,
        },
      ],
      footer: { hasMoreToGenerate: false },
    };
  }

  // FILES GENERATED
  if (promptOutput.header.outcome === 'files-generated') {
    if (!promptOutput.contents || promptOutput.contents.length === 0) {
      throw new Error('files-generated outcome should have a file list');
    }
    const outputFiles = promptOutput.contents;
    info(`Files generated: ${outputFiles.length}`, args.progressLogFunc, args.progressLogLevel);

    for (let i = 0; i < outputFiles.length; i += 1) {
      const file = outputFiles[i];
      const filePath = path.join(args.outputDir, file.filename);

      info(`  ${file.filename}`);

      if (!file.content) {
        throw new Error('File content should not be empty');
      }

      // create folder if it doesn't exist
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // write file (replace if exists)
      fs.writeFileSync(filePath, file.content);

      if (typeof selfOutput === 'undefined') {
        throw new Error('selfOutput shouldnt be undefined');
      }
      selfOutput.generatedFiles.push(filePath);
    }
    debug(`Saving files to ${args.outputDir}`);

    if (promptOutput.footer.hasMoreToGenerate) {
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
          prompt:
            'generate additional files or source codes. update already generated files if needed.',
        },
        selfOutput,
      );
      return selfOutput;
    }

    // FILES REQUESTED
  } else if (promptOutput.header.outcome === 'files-requested') {
    if (!promptOutput.contents || promptOutput.contents.length === 0) {
      throw new Error('files-requested outcome should have a file list');
    }

    info(
      `Files requested: ${promptOutput.contents.length}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );
    for (let i = 0; i < promptOutput.contents.length; i += 1) {
      const file = promptOutput.contents[i];
      debug(
        `  ${file.filename} (${file.relevance}) ${file.motivation}`,
        args.progressLogFunc,
        args.progressLogLevel,
      );
    }

    let prompt = '';

    const maxNumberOfRequestedFiles = defaultValue(
      args.requestedFilesLimits?.maxNumberOfRequestedFiles,
      10,
    );

    const filePatterns = promptOutput.contents
      // .filter((content) => content.relevance && content.relevance >= 5)
      .map((content) => content.filename);

    const maxNumberOfFiles = maxNumberOfRequestedFiles - selfOutput.totalRequestedFiles;

    const requestedFilesPrompt = promptFileContents({
      baseDir: args.requestedFilesDir,
      filePatterns,
      maxNumberOfFiles,
      ...args.requestedFilesLimits,
    });

    // add requested files counter to global total
    selfOutput.totalRequestedFiles += requestedFilesPrompt.filesProcessed.length;

    const missingFiles = promptOutput.contents.filter(
      (item) => !requestedFilesPrompt.filesProcessed.includes(item.filename),
    );

    info(
      `Files provided: ${requestedFilesPrompt.filesProcessed.length}`,
      args.progressLogFunc,
      args.progressLogLevel,
    );

    for (let i = 0; i < missingFiles.length; i += 1) {
      const file = missingFiles[i];
      debug(`  !${file.filename}`, args.progressLogFunc, args.progressLogLevel);
    }

    prompt = requestedFilesPrompt.fileContentsPrompt;

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
  } else if (promptOutput.header.outcome === 'notes-generated') {
    if (promptOutput.contents) {
      selfOutput.notes.push(...promptOutput.contents.map((content) => content.content));
    }
  } else {
    throw new Error(`Unexpected outcome: ${promptOutput.header.outcome}`);
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
