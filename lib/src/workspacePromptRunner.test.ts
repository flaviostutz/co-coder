/* eslint-disable camelcase */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { workspacePromptRunner } from './workspacePromptRunner';

describe('workspacePromptRunner', () => {
  let openAIClient: any;
  let tempDir: string;

  beforeEach(() => {
    // mock OpenAI client
    openAIClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    // create a temporary directory with sample workspace files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));

    // create 5 sample files in the temporary directory
    for (let i = 1; i <= 5; i += 1) {
      fs.writeFileSync(path.join(tempDir, `file${i}.txt`), `This is file ${i}.`);
    }
  });

  it('should run a prompt using workspacePromptRunner()', async () => {
    const prompt = 'This is a sample prompt.';
    const expectedCompletion = JSON.stringify({
      outcome: 'codes-generated',
      files: [
        {
          filename: 'new-code.txt',
          contents: 'TEST CODE',
        },
      ],
    });

    openAIClient.chat.completions.create.mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: expectedCompletion }, finish_reason: 'stop' },
      ],
    });

    const result = await workspacePromptRunner({
      codePromptGeneratorArgs: {
        taskDescription: prompt,
        workspaceFiles: {
          baseDir: tempDir,
          fullContentsRegexes: ['.*\\.txt'],
        },
        example: 'Use all files in the workspace as an example.',
        projectInformation: '',
      },
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
    });

    // check if tempDir is 6, meaning one new files was generated
    const files = fs.readdirSync(tempDir);
    expect(files).toHaveLength(6);

    expect(result).toBeDefined();
  });

  it('should send additional files if requested by the model', async () => {
    const prompt = 'This is a sample prompt.';

    // first answer will request additional files
    openAIClient.chat.completions.create.mockResolvedValueOnce({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              outcome: 'files-requested',
              files: [{ filename: 'unknown-additional-file.txt' }, { filename: 'file5.txt' }],
            }),
          },
          finish_reason: 'stop',
        },
      ],
    });

    // second answer will generate code
    openAIClient.chat.completions.create.mockResolvedValueOnce({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              outcome: 'codes-generated',
              files: [
                {
                  filename: 'new-code.txt',
                  contents: 'THIS IS A NEW CODE!!',
                },
              ],
            }),
          },
          finish_reason: 'stop',
        },
      ],
    });

    const result = await workspacePromptRunner({
      codePromptGeneratorArgs: {
        taskDescription: prompt,
        workspaceFiles: {
          baseDir: tempDir,
          fullContentsRegexes: ['file1\\.txt', 'file2\\.txt'],
          previewContentsRegexes: ['file3\\.txt'],
        },
        example: 'Use all files in the workspace as an example.',
      },
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
    });

    expect(openAIClient.chat.completions.create).toHaveBeenCalledTimes(2);

    expect(result).toBeDefined();
  });

  it('should generate code and write to workspace dir', async () => {
    const prompt = 'This is a sample prompt.';

    // answer with generated code (file new-code.txt)
    openAIClient.chat.completions.create.mockResolvedValueOnce({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              outcome: 'codes-generated',
              files: [
                {
                  filename: 'new-code.txt',
                  contents: 'THIS IS A NEW CODE!!',
                },
              ],
            }),
          },
          finish_reason: 'stop',
        },
      ],
    });

    const result = await workspacePromptRunner({
      codePromptGeneratorArgs: {
        taskDescription: prompt,
        workspaceFiles: {
          baseDir: tempDir,
          fullContentsRegexes: ['file1\\.txt', 'file2\\.txt'],
        },
        example: 'Use all files in the workspace as an example.',
      },
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
    });

    // check if tempDir is 6, meaning one new file was generated
    const files = fs.readdirSync(tempDir);
    expect(files).toHaveLength(6);

    const newCodeContents = fs.readFileSync(path.join(tempDir, 'new-code.txt'), 'utf-8');
    expect(newCodeContents).toBe('THIS IS A NEW CODE!!');

    expect(result.generatedFiles[0]).toBe(path.join(tempDir, 'new-code.txt'));
  });
  afterEach(() => {
    // clean up the temporary directory
    fs.rmSync(tempDir, { recursive: true });
  });
});
