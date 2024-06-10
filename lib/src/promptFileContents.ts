import * as fs from 'fs';
import * as path from 'path';

import { isWithinTokenLimit } from 'gpt-tokenizer';

export type PromptFileContentsArgs = {
  /**
   * Base directory where the workspace files are located
   * @required
   */
  baseDir: string;
  /**
   * Regexes to filter files and get contents.
   * It will be used to get the contents of the files to be sent to the OpenAI API.
   * @required
   */
  filenameRegexes: string[];
  /**
   * Regexes of filenames to ignore so it's contents won't be fetched
   * even if the filename matches filenameRegexes
   */
  ignoreFilenameRegexes?: string[];
  /**
   * Maximum individual file size to be included in the prompt. Larger files will be truncated
   * @default 20000
   */
  maxFileSize?: number;
  /**
   * Max number of tokens with the contents of the files.
   * Stops processing files if the token limit is reached. This will simply ignore the rest of the files
   * and return everything that was processed until that point.
   * This is a safety measure to prevent sending too much data to the API
   * @default 50000
   */
  maxTokens?: number;
};

export type PromptFileContentsResponse = {
  /**
   * Filename and contents of all files that matched the regexes in prompt format
   */
  fileContentsPrompt: string;
  /**
   * Total files that were added to the response as a prompt
   * These include truncated and complete files
   */
  filesProcessed: string[];
  /**
   * Total files that were skipped because the total token limit was reached
   */
  filesSkipped: string[];
  /**
   * Total files that were truncated because they were too large (related to maxSize)
   * These files were added to the response, but their contents were truncated
   */
  filesTruncated: string[];
};

/**
 * Given a base dir, describe the files and its contents
 * in a output text in a way that the LLM engine can
 * understand the structure of a workspace.
 * @param baseDir root dir
 * @param filesRegexArray array of regex to filter files. if not provided, all files will be considered
 * @param maxFileSize maximum individual file size to be included in the prompt. Larger files will be truncated. Defaults to 1000
 */
export const promptFileContents = (args: PromptFileContentsArgs): PromptFileContentsResponse => {
  if (!fs.existsSync(args.baseDir)) {
    throw new Error(`Directory ${args.baseDir} does not exist`);
  }

  let { maxFileSize } = args;
  if (!maxFileSize) {
    maxFileSize = 20000;
  }

  let fileContentsPrompt = '';

  let { maxTokens } = args;
  if (!maxTokens) {
    maxTokens = 50000;
  }

  const filesProcessed: string[] = [];
  const filesSkipped: string[] = [];
  const filesTruncated: string[] = [];

  const traverseDirectory = (dirPath: string): void => {
    const items = fs.readdirSync(dirPath);

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(args.baseDir, fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (stat.isFile()) {
        // full file contents
        if (args.filenameRegexes) {
          const fileRegexMatch = args.filenameRegexes.some((regex) =>
            new RegExp(regex).test(relativePath),
          );
          if (fileRegexMatch) {
            // check if the file should be ignored
            if (args.ignoreFilenameRegexes) {
              const ignoreFileRegexMatch = args.ignoreFilenameRegexes.some((regex) =>
                new RegExp(regex).test(relativePath),
              );
              // eslint-disable-next-line max-depth
              if (ignoreFileRegexMatch) {
                // eslint-disable-next-line no-continue
                continue;
              }
            }

            let contents = fs.readFileSync(fullPath, 'utf8');
            let truncated = false;
            if (contents.length > maxFileSize) {
              contents = contents.substring(0, maxFileSize);
              truncated = true;
            }
            const filePrompt = `File ${relativePath}: \`\`\`${contents}\`\`\`\n\n`;

            // use this file if we are within the token limit
            if (isWithinTokenLimit(fileContentsPrompt + filePrompt, maxTokens)) {
              filesProcessed.push(relativePath);
              fileContentsPrompt += filePrompt;
              // eslint-disable-next-line max-depth
              if (truncated) {
                filesTruncated.push(relativePath);
              }
              // ignore this file if we reached the token limit
            } else {
              filesSkipped.push(relativePath);
            }
          }
        }
      }
    }
  };

  traverseDirectory(args.baseDir);

  return {
    fileContentsPrompt,
    filesProcessed,
    filesSkipped,
    filesTruncated,
  };
};
