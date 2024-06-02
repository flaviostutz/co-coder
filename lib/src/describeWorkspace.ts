import * as fs from 'fs';
import * as path from 'path';

/**
 * Given a base dir, describe the files and its contents
 * in a output text in a way that LLM engines can
 * understand the structure of a workspace.
 * @param baseDir root dir
 * @param filesRegex regex to filter files. if not provided, all files will be considered
 */
export const describeWorkspace = (baseDir: string, filesRegex: string): string => {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Directory ${baseDir} does not exist`);
  }

  let output =
    'Below there is a sequence of files and its contents. They are part of a workspace with source codes\n\n';

  const traverseDirectory = (dirPath: string): void => {
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);

      if (fs.statSync(fullPath).isDirectory()) {
        traverseDirectory(fullPath);
      } else if (new RegExp(filesRegex).test(item)) {
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        output += `File ${fullPath}:\n${fileContent}\n\n`;
      }
    });
  };

  traverseDirectory(baseDir);

  return output;
};
