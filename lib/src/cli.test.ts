import fs from 'fs';

import { workspacePromptRunner } from './workspacePromptRunner';
import { run } from './cli';
import { PromptProcessResult } from './types';

jest.mock('./workspacePromptRunner');

// mock workspacePromptRunner so it doesn't call OpenAI
const mockWorkspacePromptRunner = workspacePromptRunner as jest.MockedFunction<
  typeof workspacePromptRunner
>;
mockWorkspacePromptRunner.mockImplementation(
  async () =>
    ({
      generatedFiles: ['dummyfile.txt'],
      stats: {
        promptCounter: 1,
        sessionInputTokens: 10,
        sessionOutputTokens: 10,
      },
      notes: ['test'],
    }) as PromptProcessResult,
);

let tempDir: string;

describe('when using cli', () => {
  beforeAll(() => {
    // create a temporary directory with sample workspace files
    tempDir = fs.mkdtempSync('cli-tests-');
  });
  afterAll(() => {
    fs.rmdirSync(tempDir, { recursive: true });
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

    stdout = '';
    let status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--base-dir=${tempDir}`,
      `--files="*.txt"`,
      `--model=gpt-4o`,
      `--api-key=xxxxxx`,
    ]);
    expect(stdout).toMatch('files generated');
    expect(status).toBe(0);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--base-dir=${tempDir}`,
      `--files="*.txt"`,
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
      `--base-dir=${tempDir}`,
      `--files="*.txt"`,
      `--model="gpt-4o"`,
      `--api-key="xxxxxx"`,
    ]);
    expect(stdout).toMatch('files generated');
    expect(status).toBe(0);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--base-dir=${tempDir}`,
      `--files="*.txt"`,
      `--model="gpt-4o"`,
      `--api-provider="azure"`,
      `--api-url="https://azure.com"`,
      `--api-key="xxxxxx"`,
    ]);
    expect(stdout).toMatch('files generated');
    expect(status).toBe(0);

    stdout = '';
    status = await run([
      '',
      '',
      'run',
      `--task="describe the workspace in 100 words and save to DESCRIPTION.md"`,
      `--base-dir=${tempDir}`,
      `--files="*.txt"`,
      `--model="gpt-4o"`,
      `--api-provider="azure"`,
      `--api-key="xxxxxx"`,
    ]);
    expect(stdout).toMatch('"api-url" is required');
    expect(status).toBe(1);
  });
});
