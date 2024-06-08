/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Given a base dir, describe the files and its contents
 * in a output text in a way that the LLM engine can
 * understand the structure of a workspace.
 * @param baseDir root dir
 * @param filesRegexArray array of regex to filter files. if not provided, all files will be considered
 * @param maxFileSize maximum individual file size to be included in the prompt. Larger files will be truncated. Defaults to 1000
 */
export const promptFileContents = (
  baseDir: string,
  filesRegexes: string[] = [],
  maxFileSize?: number,
): string => {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Directory ${baseDir} does not exist`);
  }

  let output = '';

  const traverseDirectory = (dirPath: string): void => {
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (stat.isFile()) {
        const fileRegexMatch = filesRegexes.some((regex) => new RegExp(regex).test(fullPath));
        if (fileRegexMatch) {
          let contents = fs.readFileSync(fullPath, 'utf8');
          if (maxFileSize && contents.length > maxFileSize) {
            console.log(`Truncating file ${fullPath}: too large`);
            contents = contents.substring(0, maxFileSize);
          }
          output += `File: ${fullPath}: \`\`\`${contents}\`\`\`\n\n`;
        }
      }
    });
  };

  traverseDirectory(baseDir);

  return output;
};
