/* eslint-disable camelcase */
import { OpenAI } from 'openai';

import { createOpenAICompletionSession, CompletionOptions } from './openaiCompletionSession';

jest.mock('openai');

describe('createOpenAICompletionSession', () => {
  let openaiClient: jest.Mocked<OpenAI>;
  let completionOptions: CompletionOptions;
  let session: ReturnType<typeof createOpenAICompletionSession>;

  beforeEach(() => {
    // mock OpenAI client
    openaiClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;
    completionOptions = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
    };
    session = createOpenAICompletionSession(openaiClient, completionOptions);
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
      ...completionOptions,
      messages: [
        { role: 'system', content: 'You are an AI assistant that helps people find information.' },
        { role: 'user', content: prompt },
        // this line below is only there because we mutation the conversation object and mock is being confused. it shouldn't be here actually
        { role: 'assistant', content: expectedCompletion },
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

  it('should fail if session tokens gets too large', async () => {
    const prompt = 'Hello, AI!';
    const expectedCompletion = 'Hello, human!';

    const session2 = createOpenAICompletionSession(openaiClient, {
      ...completionOptions,
      maxConversationTokens: 20,
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
      'Total tokens in this session exceeded limit. ',
    );
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
});
