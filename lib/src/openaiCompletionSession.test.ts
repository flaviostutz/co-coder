/* eslint-disable camelcase */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { OpenAI } from 'openai';

import { createOpenAICompletionSession } from './openaiCompletionSession';
import { CompletionOptions, Message } from './types';

jest.mock('openai');

describe('createOpenAICompletionSession', () => {
  let openaiClient: jest.Mocked<OpenAI>;
  let completionOptions: CompletionOptions;
  let session: ReturnType<typeof createOpenAICompletionSession>;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));

  beforeEach(() => {
    // mock OpenAI client
    openaiClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    completionOptions = {
      openaiConfig: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      },
    };
    session = createOpenAICompletionSession(openaiClient, completionOptions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should send a prompt and receive a completion', async () => {
    const prompt = 'Hello, AI!';
    const expectedCompletion = 'Hello, human!';

    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: expectedCompletion }, finish_reason: 'stop' },
      ],
    });

    const response = await session.sendPrompt(prompt);

    expect(openaiClient.chat.completions.create).toHaveBeenCalledWith({
      ...completionOptions.openaiConfig,
      messages: [
        { role: 'system', content: 'You are an AI assistant that helps people find information.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    });

    expect(response.response).toEqual(expectedCompletion);
    expect(response.conversation.length).toBe(3);
    expect(response.conversation).toStrictEqual([
      { role: 'system', content: 'You are an AI assistant that helps people find information.' },
      { role: 'user', content: prompt },
      { role: 'assistant', content: expectedCompletion },
    ]);
  });

  it('should send a prompt, receive a completion and save to the conversation file', async () => {
    const loadConversationFile = path.join(tmpDir, `test-${Date.now()}.json`);

    // mock OpenAI client
    const openaiClient1 = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    completionOptions = {
      openaiConfig: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      },
    };

    (openaiClient1.chat.completions.create as jest.Mock).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: 'Hello, human!' }, finish_reason: 'stop' },
      ],
    });

    const sessionWithFile = createOpenAICompletionSession(openaiClient1, completionOptions);

    await sessionWithFile.sendPrompt('Hello, AI!');
    sessionWithFile.saveConversation(loadConversationFile);

    // check if the conversation was saved to the file correctly
    const fileContents = fs.readFileSync(loadConversationFile, 'utf8');
    const savedConversation = JSON.parse(fileContents) as Message[];
    expect(savedConversation.length).toBe(3);
    expect(savedConversation).toStrictEqual([
      { content: 'You are an AI assistant that helps people find information.', role: 'system' },
      { content: 'Hello, AI!', role: 'user' },
      { content: 'Hello, human!', role: 'assistant' },
    ]);
  });

  it('should send a prompt from an existing file and receive a completion', async () => {
    // prepare conversation file with contents
    const loadConversationFile = path.join(tmpDir, `test-${Date.now()}.json`);
    const existingConversationContents = [
      { content: 'You are an AI assistant that helps people find information.', role: 'system' },
      { content: 'Hello, AI2!', role: 'user' },
      { content: 'Hello, human2!', role: 'assistant' },
    ];
    fs.writeFileSync(loadConversationFile, JSON.stringify(existingConversationContents));

    // mock OpenAI client
    const openaiClient1 = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    completionOptions = {
      openaiConfig: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      },
    };

    (openaiClient1.chat.completions.create as jest.Mock).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: 'Hello, human3!' }, finish_reason: 'stop' },
      ],
    });

    const sessionWithFile = createOpenAICompletionSession(openaiClient1, completionOptions);
    sessionWithFile.loadConversation(loadConversationFile);
    await sessionWithFile.sendPrompt('Hello, AI3!');

    // check if call to API with made with correct conversation
    expect(openaiClient1.chat.completions.create).toHaveBeenCalledWith({
      ...completionOptions.openaiConfig,
      messages: [
        { content: 'You are an AI assistant that helps people find information.', role: 'system' },
        { content: 'Hello, AI2!', role: 'user' },
        { content: 'Hello, human2!', role: 'assistant' },
        { content: 'Hello, AI3!', role: 'user' },
      ],
      stream: false,
    });

    // check if conversation contents were updated correctly
    expect(sessionWithFile.getConversation().length).toBe(5);
    expect(sessionWithFile.getConversation()).toStrictEqual([
      { content: 'You are an AI assistant that helps people find information.', role: 'system' },
      { content: 'Hello, AI2!', role: 'user' },
      { content: 'Hello, human2!', role: 'assistant' },
      { content: 'Hello, AI3!', role: 'user' },
      { content: 'Hello, human3!', role: 'assistant' },
    ]);

    // check if saved conversation file was updated correctly
    sessionWithFile.saveConversation(loadConversationFile);
    const fileContents = fs.readFileSync(loadConversationFile, 'utf8');
    const savedConversationFileContents = JSON.parse(fileContents);
    expect(savedConversationFileContents.length).toBe(5);
  });

  it('should fail if session tokens gets too large', async () => {
    const prompt = 'Hello, AI!';
    const expectedCompletion = 'Hello, human!';

    const session2 = createOpenAICompletionSession(openaiClient, {
      ...completionOptions,
      maxTokensTotal: 20,
    });

    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: expectedCompletion }, finish_reason: 'stop' },
      ],
    });

    await session2.sendPrompt(prompt);
    await expect(session2.sendPrompt(prompt)).rejects.toThrow(
      'Exceeded max total tokens sent/received',
    );
  });

  it('should fail if tokens for a single request gets too large', async () => {
    const prompt = 'Hello, AI! Hello, AI! Hello, AI!';
    const expectedCompletion = 'Hello, human!';

    const session2 = createOpenAICompletionSession(openaiClient, {
      ...completionOptions,
      maxTokensPerRequest: 10,
    });

    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: expectedCompletion }, finish_reason: 'stop' },
      ],
    });

    await expect(session2.sendPrompt(prompt)).rejects.toThrow('Exceeded max tokens per request');
  });

  it('should fail if sending too many prompts to this session', async () => {
    const prompt = 'Hello, AI!';
    const expectedCompletion = 'Hello, human!';

    const session2 = createOpenAICompletionSession(openaiClient, {
      ...completionOptions,
      maxPrompts: 1,
    });

    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [
        { message: { role: 'assistant', content: expectedCompletion }, finish_reason: 'stop' },
      ],
    });

    await session2.sendPrompt(prompt);
    await expect(session2.sendPrompt(prompt)).rejects.toThrow('Too many prompts in this session');
  });

  it('should send three prompts and receive three completions', async () => {
    const prompts = ['Hello, AI!', 'How are you?', 'Tell me a joke.'];
    const expectedCompletions = [
      'Hello, human!',
      'I am an AI and do not have feelings, but I am functioning as expected.',
      "Why don't scientists trust atoms? Because they make up everything!",
    ];

    (openaiClient.chat.completions.create as jest.Mock)
      .mockResolvedValueOnce({
        id: 'test-id-1',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        choices: [
          {
            message: { role: 'assistant', content: expectedCompletions[0] },
            finish_reason: 'stop',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'test-id-2',
        object: 'chat.completion',
        created: 1234567891,
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        choices: [
          {
            message: { role: 'assistant', content: expectedCompletions[1] },
            finish_reason: 'stop',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'test-id-3',
        object: 'chat.completion',
        created: 1234567892,
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        choices: [
          {
            message: { role: 'assistant', content: expectedCompletions[2] },
            finish_reason: 'stop',
          },
        ],
      });

    let lastResponse;
    for (let i = 0; i < prompts.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastResponse = await session.sendPrompt(prompts[i]);
      expect(lastResponse.response).toBe(expectedCompletions[i]);
    }

    expect(lastResponse?.conversation.length).toBe(7);
    expect(lastResponse?.conversation[2].content).toBe('Hello, human!');
    expect(lastResponse?.conversation[4].content).toBe(
      'I am an AI and do not have feelings, but I am functioning as expected.',
    );
    expect(lastResponse?.conversation[6].content).toBe(
      "Why don't scientists trust atoms? Because they make up everything!",
    );
  });

  it('should send a prompt and receive a completion after re-sending continuation requests multiple times because max tokens were reached', async () => {
    const prompt = 'Hello, AI!';

    // first fragment
    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValueOnce({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [{ message: { role: 'assistant', content: 'Hel' }, finish_reason: 'length' }],
    });

    // second fragment
    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValueOnce({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [{ message: { role: 'assistant', content: 'lo, hu' }, finish_reason: 'length' }],
    });

    // third fragment
    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValueOnce({
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      choices: [{ message: { role: 'assistant', content: 'man!!' }, finish_reason: 'stop' }],
    });

    const response = await session.sendPrompt(prompt);

    expect(response.response).toEqual('Hello, human!!');
    expect(response.conversation.length).toBe(5);
    expect(response.conversation).toStrictEqual([
      { role: 'system', content: 'You are an AI assistant that helps people find information.' },
      { role: 'user', content: prompt },
      { role: 'assistant', content: 'Hel' },
      { role: 'assistant', content: 'lo, hu' },
      { role: 'assistant', content: 'man!!' },
    ]);
  });
});
