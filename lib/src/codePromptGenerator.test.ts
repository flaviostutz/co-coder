import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { codePromptGenerator } from './codePromptGenerator';
import { PromptGeneratorArgs } from './types';

describe('codePromptGenerator', () => {
  let tempDir: string;
  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });

  it('should correctly generate a code prompt for first call', () => {
    const files = Array.from({ length: 10 }, (_, i) => `file${i + 1}.txt`);
    files.forEach((file) => fs.writeFileSync(path.join(tempDir, file), `This is ${file}`));

    const args: PromptGeneratorArgs = {
      task: 'Test instructions',
      projectInformation: 'Test project information',
      workspaceFiles: {
        fullContents: {
          baseDir: tempDir,
          filePatterns: ['*.txt'],
        },
      },
      example: 'Test example',
    };

    const output = codePromptGenerator(true, args);

    expect(output.fullFileContents?.filesProcessed.length).toBe(10);
    expect(output.previewFileContents).toBeUndefined();
    expect(output.codePrompt).toContain('#### Coding style');
    expect(output.codePrompt).toContain('hasMoreToGenerate');
    files.forEach((file) => expect(output.codePrompt).toContain(`${file}`));
  });

  it('should correctly generate a code prompt for subsequent calls', () => {
    const files = Array.from({ length: 10 }, (_, i) => `file${i + 1}.txt`);
    files.forEach((file) => fs.writeFileSync(path.join(tempDir, file), `This is ${file}`));

    const args: PromptGeneratorArgs = {
      task: 'Test instructions',
      workspaceFiles: {
        fullContents: {
          baseDir: tempDir,
          filePatterns: ['*.txt'],
        },
      },
      example: 'Test example',
    };

    const output = codePromptGenerator(false, args);

    expect(output.fullFileContents?.filesProcessed.length).toBe(10);
    expect(output.previewFileContents).toBeUndefined();
    expect(output.codePrompt).toContain('## Input Data');
    expect(output.codePrompt).not.toContain('#### Coding style');
    expect(output.codePrompt).not.toContain('hasMoreToGenerate');
    files.forEach((file) => expect(output.codePrompt).toContain(`${file}`));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
