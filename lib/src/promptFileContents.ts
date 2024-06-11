import * as fs from 'fs';
import * as path from 'path';

import { isWithinTokenLimit } from 'gpt-tokenizer';

import { PromptFileContentsArgs, PromptFileContentsResponse } from './types';

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

  const maxFileSize = args.maxFileSize || 20000;

  let fileContentsPrompt = '';

  const maxTokens = args.maxTokens || 50000;

  const filesProcessed: string[] = [];
  const filesSkipped: string[] = [];
  const filesTruncated: string[] = [];

  const traverseDirectory = (dirPath: string): void => {
    if (dirPath.includes('node_modules')) return;
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
              const ignoreFileRegexMatch = args.ignoreFilenameRegexes.some((regex) => {
                return new RegExp(regex).test(relativePath);
              });
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
