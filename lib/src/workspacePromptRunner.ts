/* eslint-disable camelcase */
import path from 'path';
import fs from 'fs';

import openai, { OpenAI } from 'openai';

import { CodePromptGeneratorArgs, codePromptGenerator } from './codePromptGenerator';
import { parseOutputFiles } from './parseOutputFiles';
import { promptFileContents } from './promptFileContents';
import { createOpenAICompletionSession, OpenAICompletionSession } from './openaiCompletionSession';

/**
 * Arguments for sending a prompt to ChatGPT and processing the response
 */
export type SendAndProcessPromptArgs = {
  /**
   * Prompt to be sent to OpenAI API
   */
  prompt: string;
  /**
   * Directory where the workspace files are located
   * This is where the context files will be read from
   */
  workspaceDir: string;
  /**
   * Output directory where the generated files will be written
   * @required
   */
  outputDir: string;
  /**
   * OpenAI client to be used for generating code
   */
  openAIClient: OpenAI; // Replace 'any' with the actual type if known
  /**
   * OpenAI model to be used for generating code
   */
  model: openai.ChatModel;
  /**
   * OpenAI completion session to be used for generating code
   * Used to track the conversation state.
   * If defined, "model" param is ignored.
   * If not provided, a new session will be created using the "model" parameter.
   */
  openAICompletionSession?: OpenAICompletionSession;
};

/**
 * Arguments for running the workspace prompt runner
 */
export type WorkspacePromptRunnerArgs = Pick<
  SendAndProcessPromptArgs,
  'outputDir' | 'openAIClient' | 'model'
> & {
  /**
   * Arguments for generating the code prompt
   */
  codePromptGeneratorArgs: CodePromptGeneratorArgs;
};

/**
 * Generate prompt based on workspace file, send it to OpenAI API, process its response (sometimes it will send additional files as requested by the model) and write any generated files to the output directory
 * @param args {WorkspacePromptRunnerArgs}
 */
export const workspacePromptRunner = async (args: WorkspacePromptRunnerArgs): Promise<void> => {
  const prompt = codePromptGenerator(args.codePromptGeneratorArgs);

  await sendAndProcessWorkspacePrompt({
    prompt,
    workspaceDir: args.codePromptGeneratorArgs.workspaceFiles.baseDir,
    outputDir: args.outputDir,
    openAIClient: args.openAIClient,
    model: args.model,
  });
};

/**
 * Send prompt to OpenAI API, process the input and create generated files on output dir
 * @param args {SendAndProcessPromptArgs}
 */
const sendAndProcessWorkspacePrompt = async (
  args: SendAndProcessPromptArgs,
  totalFilePaths?: string[],
): Promise<string[]> => {
  let selfFilePaths = totalFilePaths;
  // initialize on first call
  if (!selfFilePaths) {
    selfFilePaths = [];
  }
  let chatSession = args.openAICompletionSession;

  if (!chatSession) {
    console.log('Creating new chat session');
    chatSession = createOpenAICompletionSession(args.openAIClient, {
      model: args.model,
      temperature: 0, // make the output more deterministic amongst calls
      seed: 0, // make the output more deterministic amongst calls
      topP: 0.95,
    });
  }
  console.log(`>> Sending prompt: ${args.prompt}`);
  const output = await chatSession.sendPrompt(args.prompt);
  const responseOutput = output.response;

  console.log(`>> Response: ${responseOutput}. tokens=${output.tokenCount}`);

  // CODE GENERATED
  if (responseOutput.indexOf('outcome: code-generated') > -1) {
    const outputFiles = parseOutputFiles(responseOutput);
    console.log(`Writing ${outputFiles.length} files to ${args.outputDir}`);

    outputFiles.forEach((file) => {
      const filePath = path.join(args.outputDir, file.filename);

      console.log(`Writing generated file: ${filePath}`);
      fs.writeFileSync(filePath, file.contents);
      if (typeof selfFilePaths === 'undefined') {
        throw new Error('selfFilePaths shouldnt be undefined');
      }
      selfFilePaths.push(filePath);
    });
    if (responseOutput.indexOf('note: more-codes-to-be-generated') > -1) {
      // request remaining files to be generated
      selfFilePaths = await sendAndProcessWorkspacePrompt(
        {
          ...args,
          openAICompletionSession: chatSession,
          prompt: 'generate additional source codes',
        },
        selfFilePaths,
      );
    }

    // FILES REQUESTED
  } else if (responseOutput.indexOf('outcome: files-requested') > -1) {
    const requestedFileList = parseFileList(responseOutput);

    const sendFilesRegexes = requestedFileList
      .filter((file) => file.relevanceScore > 0.5)
      .map((file) => file.fileName);

    const requestedFilesPrompt = promptFileContents({
      baseDir: args.workspaceDir,
      fullContentsRegexes: sendFilesRegexes,
    });

    selfFilePaths = await sendAndProcessWorkspacePrompt(
      {
        ...args,
        openAICompletionSession: chatSession,
        prompt: requestedFilesPrompt.fullFileContents,
      },
      selfFilePaths,
    );
  } else {
    throw new Error(`Unexpected response from model: ${responseOutput}`);
  }
  return selfFilePaths;
};

const parseFileList = (responseOutput: string): { fileName: string; relevanceScore: number }[] => {
  const fileList = responseOutput.split('\n');
  return fileList
    .filter((file) => file.startsWith('File '))
    .map((file) => {
      const match = file.match(/File (.*) \((.*)\)/);
      if (match) {
        return {
          fileName: match[1],
          relevanceScore: parseFloat(match[2]),
        };
      }
      throw new Error('Invalid file format in response.');
    });
};
