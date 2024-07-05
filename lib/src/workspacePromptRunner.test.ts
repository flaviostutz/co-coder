/* eslint-disable camelcase */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { workspacePromptRunner } from './workspacePromptRunner';

describe('workspacePromptRunner', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // create a temporary directory with sample workspace files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));

    // create 5 sample files in the temporary directory
    for (let i = 1; i <= 5; i += 1) {
      fs.writeFileSync(path.join(tempDir, `file${i}.txt`), `This is file ${i}.`);
    }
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
            content: `HEADER (outcome="files-generated"; count=1)
CONTENT_START (filename="new-code.txt"; relevance=10; motivation="example")
THIS IS A NEW CODE!!
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=false)`,
          },
          finish_reason: 'stop',
        },
      ],
    });

    const result = await workspacePromptRunner({
      promptGenerator: {
        task: prompt,
        workspaceFiles: {
          fullContents: {
            baseDir: tempDir,
            filePatterns: ['file1.txt', 'file2.txt'],
          },
        },
        example: 'Use all files in the workspace as an example.',
      },
      requestedFilesDir: tempDir,
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
      requestedFilesLimits: {
        maxFileSize: 10000,
        maxTokens: 5000,
        ignoreFilePatterns: [],
      },
    });

    // check if tempDir is 6, meaning one new file was generated
    const files = fs.readdirSync(tempDir);
    expect(files).toHaveLength(6);

    const newCodeContents = fs.readFileSync(path.join(tempDir, 'new-code.txt'), 'utf-8');
    expect(newCodeContents).toBe('THIS IS A NEW CODE!!');

    expect(result.generatedFiles[0]).toBe(path.join(tempDir, 'new-code.txt'));
  });

  it('should generate code and save conversation to file', async () => {
    const prompt = 'This is a sample prompt.';
    const conversationFile = path.join(tempDir, 'conversationtest.json');

    // INVOKE FOR THE FIRST TIME, CREATING A NEW CONVERSATION FILE
    // first answer with generated code (file new-code.txt)
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
            content: `HEADER (outcome="files-generated"; count=1)
CONTENT_START (filename="new-code.txt"; relevance=10; motivation="example")
THIS IS A NEW CODE!!
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=false)`,
          },
          finish_reason: 'stop',
        },
      ],
    });

    await workspacePromptRunner({
      promptGenerator: {
        task: prompt,
        workspaceFiles: {
          fullContents: {
            baseDir: tempDir,
            filePatterns: ['file1.txt', 'file2.txt'],
          },
        },
        example: 'Use all files in the workspace as an example.',
      },
      requestedFilesDir: tempDir,
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
      conversationFile,
    });

    // check if conversation file was created
    const conversationFileContents = fs.readFileSync(conversationFile, 'utf-8');
    expect(conversationFileContents).toContain(`Don't generate any codes until`);

    // INVOKE FOR THE SECOND TIME REUSING EXISTING CONVERSATION FILE
    // second answer with generated code (file new-code2.txt)
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
            content: `HEADER (outcome="files-generated"; count=1)
CONTENT_START (filename="new-code2.txt"; relevance=10; motivation="example")
THIS IS A NEW CODE2!!
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=false)`,
          },
          finish_reason: 'stop',
        },
      ],
    });

    await workspacePromptRunner({
      promptGenerator: {
        task: 'generate new-code2.txt because you forgot it',
      },
      requestedFilesDir: tempDir,
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
      conversationFile,
    });

    const newCodeContents2 = fs.readFileSync(path.join(tempDir, 'new-code2.txt'), 'utf-8');
    expect(newCodeContents2).toBe('THIS IS A NEW CODE2!!');

    const fileContents = fs.readFileSync(conversationFile, 'utf-8');
    const conversationFileObj = JSON.parse(fileContents);
    expect(conversationFileObj).toHaveLength(5);
  });

  it('should run a prompt using workspacePromptRunner()', async () => {
    const prompt = 'This is a sample prompt.';

    openAIClient.chat.completions.create.mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        {
          message: {
            role: 'assistant',
            content: `HEADER (outcome="files-generated"; count=1)
CONTENT_START (filename="new-code.txt"; relevance=10; motivation="example")
test code
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=false)`,
          },
          finish_reason: 'stop',
        },
      ],
    });

    const result = await workspacePromptRunner({
      promptGenerator: {
        task: prompt,
        workspaceFiles: {
          fullContents: {
            baseDir: tempDir,
            filePatterns: ['*.txt'],
          },
        },
        example: 'Use all files in the workspace as an example.',
        projectInformation: '',
      },
      requestedFilesDir: tempDir,
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
      requestedFilesLimits: {
        maxFileSize: 10000,
        maxTokens: 5000,
        ignoreFilePatterns: [],
      },
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
            content: `HEADER (outcome="files-requested"; count=2)
CONTENT_START (filename="unknown-additional-file.txt"; relevance=10; motivation="example")
CONTENT_END (size=20; md5="f4b80d72")
CONTENT_START (filename="file5.txt"; relevance=10; motivation="example")
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=false)`,
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
            content: `HEADER (outcome="files-generated"; count=1)
CONTENT_START (filename="new-code.txt"; relevance=10; motivation="example")
THIS IS A NEW CODE!!
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=true)`,
          },
          finish_reason: 'stop',
        },
      ],
    });

    // third answer will generate more code that wasn't created in the previous call
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
            content: `HEADER (outcome="files-generated"; count=1)
CONTENT_START (filename="new-code2.txt"; relevance=10; motivation="example")
THIS IS A NEW CODE22!!
CONTENT_END (size=20; md5="f4b80d72")
FOOTER (hasMoreToGenerate=false)`,
          },
        },
      ],
    });

    const result = await workspacePromptRunner({
      promptGenerator: {
        task: prompt,
        workspaceFiles: {
          fullContents: {
            baseDir: tempDir,
            filePatterns: ['file1.txt', 'file2.txt'],
          },
          previewContents: {
            baseDir: tempDir,
            filePatterns: ['file3.txt'],
          },
        },
        example: 'Use all files in the workspace as an example.',
      },
      requestedFilesDir: tempDir,
      openAIClient,
      model: 'gpt-3.5-turbo-0125',
      outputDir: tempDir,
      progressLogLevel: 'trace',
      progressLogFunc: jest.fn(),
    });

    expect(result.stats.promptCounter).toBe(3);
    expect(openAIClient.chat.completions.create).toHaveBeenCalledTimes(3);

    expect(result).toBeDefined();
    expect(result.generatedFiles).toHaveLength(2);
  });

  it('should create notes if model outputs contents outside desired patterns (parse error)', async () => {
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
            content: `THIS IS AN INVALID RESPONSE, OUTSIDE OF THE EXPECTED PATTERN`,
          },
          finish_reason: 'stop',
        },
      ],
    });

    const result = await workspacePromptRunner({
      promptGenerator: {
        task: prompt,
        workspaceFiles: {
          fullContents: {
            baseDir: tempDir,
            filePatterns: ['file1.txt', 'file2.txt'],
          },
        },
        example: 'Use all files in the workspace as an example.',
      },
      requestedFilesDir: tempDir,
      openAIClient,
      model: 'gpt-3.5-turbo',
      outputDir: tempDir,
      requestedFilesLimits: {
        maxFileSize: 10000,
        maxTokens: 5000,
        ignoreFilePatterns: [],
      },
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toBe(
      'Model response: THIS IS AN INVALID RESPONSE, OUTSIDE OF THE EXPECTED PATTERN',
    );
  });

  afterEach(() => {
    // clean up the temporary directory
    fs.rmSync(tempDir, { recursive: true });
  });
});
