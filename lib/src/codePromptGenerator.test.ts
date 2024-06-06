import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { codePromptGenerator, CodePromptGeneratorArgs } from './codePromptGenerator';

describe('codePromptGenerator', () => {
  it('should correctly generate a code prompt', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const files = Array.from({ length: 10 }, (_, i) => `file${i + 1}.txt`);
    files.forEach((file) => fs.writeFileSync(path.join(tempDir, file), `This is ${file}`));

    const args: CodePromptGeneratorArgs = {
      taskDescription: 'Test instructions',
      projectInformation: 'Test project information',
      workspaceFiles: {
        baseDir: tempDir,
        fileRegexes: ['\\.txt$'],
      },
      example: 'Test example',
    };

    const output = codePromptGenerator(args);

    expect(output).toContain('## Instructions');
    expect(output).toContain('Fix errors proactively');
    files.forEach((file) => expect(output).toContain(`File: ${path.join(tempDir, file)}`));

    files.forEach((file) => fs.unlinkSync(path.join(tempDir, file)));
    fs.rmdirSync(tempDir);
  });
});
