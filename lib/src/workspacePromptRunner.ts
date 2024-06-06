import path from 'path';
import fs from 'fs';

import { CodePromptGeneratorArgs, codePromptGenerator } from './codePromptGenerator';
import { parseOutputFiles } from './parseOutputFiles';
import { promptFileContents } from './promptFileContents';

const PROMPT_MAX_FILE_SIZE = 50000;

export const workspacePromptRunner = async (
  args: CodePromptGeneratorArgs,
  outputDir: string,
): Promise<void> => {
  const prompt = codePromptGenerator(args);

  await sendAndProcessPrompt(prompt, args.workspaceFiles.baseDir, outputDir);
};

// send prompt to LLM, process the input and create generated files on output dir
const sendAndProcessPrompt = async (
  prompt: string,
  workspaceDir: string,
  outputDir: string,
): Promise<void> => {
  console.log(`>> Sending prompt: ${prompt}`);
  // TODO send prompt to ChatGPT

  const responseOutput = 'TODO ChatGPT response';
  console.log(`>> Response: ${responseOutput}`);

  // CODE GENERATED
  if (responseOutput.indexOf('outcome: code-generated') > -1) {
    const outputFiles = parseOutputFiles(responseOutput);
    outputFiles.forEach((file) => {
      const filePath = path.join(outputDir, file.filename);

      console.log(`Writing generated file: ${filePath}`);
      fs.writeFileSync(filePath, file.contents);
    });
    if (responseOutput.indexOf('note: more-codes-to-be-generated') > -1) {
      // request remaining files to be generated
      await sendAndProcessPrompt('generate additional source codes', workspaceDir, outputDir);
    }
  }

  // FILES REQUESTED
  if (responseOutput.indexOf('outcome: files-requested') > -1) {
    const requestedFileList = parseFileList(responseOutput);

    const sendFilesRegexes = requestedFileList
      .filter((file) => file.relevanceScore > 0.5)
      .map((file) => file.fileName);

    const requestedFilesPrompt = promptFileContents(
      workspaceDir,
      sendFilesRegexes,
      PROMPT_MAX_FILE_SIZE,
    );

    await sendAndProcessPrompt(requestedFilesPrompt, workspaceDir, outputDir);
  }
};

const parseFileList = (responseOutput: string): { fileName: string; relevanceScore: number }[] => {
  const fileList = responseOutput.split('\n');
  return fileList
    .filter((file) => file.startsWith('File:'))
    .map((file) => {
      const match = file.match(/File: (.*) \((.*)\)/);
      if (match) {
        return {
          fileName: match[1],
          relevanceScore: parseFloat(match[2]),
        };
      }
      throw new Error('Invalid file format in response.');
    });
};
