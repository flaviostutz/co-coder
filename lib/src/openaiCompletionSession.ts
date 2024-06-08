/* eslint-disable camelcase */
import { encode, isWithinTokenLimit } from 'gpt-tokenizer';
import openai, { OpenAI } from 'openai';

export type Role = 'system' | 'user' | 'assistant';

export type OpenAICompletionSession = {
  sendPrompt: (prompt: string) => Promise<SendPromptResponse>;
};

export type Message = {
  role: Role;
  content: string;
};

export type SendPromptResponse = {
  response: string;
  conversation: Message[];
  tokenCount?: number;
};

export type CompletionOptions = {
  model: openai.ChatModel;
  seed?: number | null;
  temperature?: number | null;
  topP?: number | null;
  frequencyPenalty?: number | null;
  presencePenalty?: number | null;
  /**
   * Maximum number of tokens that the API is allowed to generate in their answers
   */
  maxTokens?: number | null;
  stop?: string | null;
  /**
   * Maximum number of allowed prompts sent to the model in this session
   * This is a safety measure to prevent infinite loops and overuse of the API in case of bugs
   * Defaults to 20
   */
  maxPrompts?: number;
  /**
   * Maximum number of tokens allowed to be generated in this session
   * This is the sum of all request and response tokens sent/received in this session
   * This is a safety measure to prevent generating too much content that might indicate bugs even before invoking the API
   * Defaults to 128000 tokens
   */
  maxConversationTokens?: number;
};

export const createOpenAICompletionSession = (
  openaiClient: OpenAI,
  completionOptions: CompletionOptions,
): OpenAICompletionSession => {
  const conversation: Message[] = [
    { role: 'system', content: 'You are an AI assistant that helps people find information.' },
  ];
  let promptCounter = 0;
  const maxPrompts = completionOptions.maxPrompts || 20;

  return {
    sendPrompt: async (prompt: string): Promise<SendPromptResponse> => {
      // check max prompts
      promptCounter += 1;
      if (promptCounter > maxPrompts) {
        throw new Error(`Too many prompts in this session (${promptCounter}/${maxPrompts})`);
      }
      conversation.push({ role: 'user', content: prompt });

      // check max tokens in this session
      const maxTokens = completionOptions.maxConversationTokens || 128000;
      // '_' is added because if input is empty, isWithinTokenLimit function returns false
      const fullContents = `_ ${JSON.stringify(conversation.map((m) => m.content))}`;
      if (!isWithinTokenLimit(fullContents, maxTokens)) {
        throw new Error(
          `Total tokens in this session exceeded limit. ${
            encode(fullContents).length
          }/${maxTokens}`,
        );
      }

      // send request to openai api
      const response = await openaiClient.chat.completions.create({
        ...completionOptions,
        messages: conversation,
        stream: false,
      });

      // process response
      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('Response message content is empty');
      }
      conversation.push({ role: 'assistant', content: completion });

      return {
        response: completion,
        conversation,
        tokenCount: response.usage?.total_tokens,
      };
    },
  };
};
