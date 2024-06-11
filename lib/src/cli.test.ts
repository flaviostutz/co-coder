import path from 'path';
import fs from 'fs';
import os from 'os';

import { run } from './cli';

// mock workspacePromptRunner so it doesn't call OpenAI
jest.mock('./workspacePromptRunner', () => ({
  workspacePromptRunner: jest.fn(),
}));

describe('when using cli', () => {
  let workspaceDir: string;
  beforeEach(async () => {
    // Create a temporary directory
    workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-'));

    // Create 5 files in the temporary directory
    for (let i = 1; i <= 5; i += 1) {
      const filePath = path.join(workspaceDir, `file${i}.txt`);
      const content = `This is file ${i}`;
      fs.writeFileSync(filePath, content);
    }
  });
  afterEach(() => {
    fs.rmSync(workspaceDir, { recursive: true });
  });

  it('should execute cli tests successfuly', async () => {
    // mock console.log to get results and check them
    let stdout = '';
    // eslint-disable-next-line no-console
    console.log = (log): void => {
      stdout += log;
    };

    // run tests below sequentially to avoid issues with console.log mocking

    // invalid action
    stdout = '';
    let exitCode = await run(['', '', 'invalidaction', '-v']);
    expect(stdout).toMatch(/help/);
    expect(exitCode).toBe(1);

    stdout = '';
    exitCode = await run(['', '', '', '']);
    expect(stdout).toMatch(/help/);
    expect(exitCode).toBe(1);

    // valid action and parameters
    stdout = '';
    let status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--workspace=${workspaceDir}`,
      `--files=".*\\.txt"`,
      `--model=gpt-4o`,
      `--api-key=xxxxxx`,
    ]);
    expect(stdout).toMatch('completed');
    expect(status).toBe(0);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--workspace=${workspaceDir}`,
      `--files=".*\\.txt"`,
      `--model="gpt-4o"`,
    ]);
    expect(stdout).toMatch('"api-key" is required');
    expect(status).toBe(1);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--workspace=${workspaceDir}`,
      `--files=".*\\.txt"`,
      `--model="gpt-4o"`,
      `--api-key="xxxxxx"`,
    ]);
    expect(stdout).toMatch('completed');
    expect(status).toBe(0);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--workspace=${workspaceDir}`,
      `--files=".*\\.txt"`,
      `--model="gpt-4o"`,
      `--api-provider="azure"`,
      `--api-url="https://azure.com"`,
      `--api-key="xxxxxx"`,
    ]);
    expect(stdout).toMatch('completed');
    expect(status).toBe(0);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--workspace=${workspaceDir}`,
      `--files=".*\\.txt"`,
      `--model="gpt-4o"`,
      `--api-provider="azure"`,
      `--api-key="xxxxxx"`,
    ]);
    expect(stdout).toMatch('"api-url" is required');
    expect(status).toBe(1);
  });
});
