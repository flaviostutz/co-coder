import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { codePromptGenerator } from './codePromptGenerator';
import { CodePromptGeneratorArgs } from './types';

describe('codePromptGenerator', () => {
  it('should correctly generate a code prompt', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const files = Array.from({ length: 10 }, (_, i) => `file${i + 1}.txt`);
    files.forEach((file) => fs.writeFileSync(path.join(tempDir, file), `This is ${file}`));

    const args: CodePromptGeneratorArgs = {
      taskDescription: 'Test instructions',
      projectInformation: 'Test project information',
      workspaceFiles: {
        fullContents: {
          baseDir: tempDir,
          filePatterns: ['*.txt'],
        },
      },
      example: 'Test example',
    };

    const output = codePromptGenerator(args);

    expect(output.fullFileContents?.filesProcessed.length).toBe(10);
    expect(output.previewFileContents).toBeUndefined();
    expect(output.codePrompt).toContain('## Instructions');
    expect(output.codePrompt).toContain('hasMoreToGenerate');
    files.forEach((file) => expect(output.codePrompt).toContain(`${file}`));

    files.forEach((file) => fs.unlinkSync(path.join(tempDir, file)));
    fs.rmdirSync(tempDir);
  });
});
