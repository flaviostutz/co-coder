/* eslint-disable camelcase */
import { encode, isWithinTokenLimit } from 'gpt-tokenizer';
import { OpenAI } from 'openai';

import {
  CompletionOptions,
  OpenAICompletionSession,
  Message,
  SendPromptResponse,
  SessionStats,
} from './types';

export const createOpenAICompletionSession = (
  openaiClient: OpenAI,
  completionOptions: CompletionOptions,
): OpenAICompletionSession => {
  const conversation: Message[] = [
    { role: 'system', content: 'You are an AI assistant that helps people find information.' },
  ];
  let promptCounter = 0;

  const maxPrompts = completionOptions.maxPrompts || 5;
  const maxTokensPerRequest = completionOptions.maxTokensPerRequest || 4000;
  const maxTokensTotal = completionOptions.maxTokensTotal || 12000;

  let sessionInputTokens = 0;
  let sessionOutputTokens = 0;

  return {
    sendPrompt: async (prompt: string): Promise<SendPromptResponse> => {
      // check max prompts
      promptCounter += 1;
      if (promptCounter > maxPrompts) {
        throw new Error(`Too many prompts in this session (${promptCounter}/${maxPrompts})`);
      }
      conversation.push({ role: 'user', content: prompt });

      // check max tokens in this session
      // '_' is added because if input is empty, isWithinTokenLimit function returns false
      const fullContents = `_ ${JSON.stringify(conversation.map((m) => m.content))}`;
      const requestTokensCount = encode(fullContents).length;

      // the actual totalTokensCounter will be updated from the response usage info later on
      // but for now we do a check based on the request tokens to avoid sending too many tokens to the API beforehand
      const sessionTotalTokens = sessionInputTokens + sessionOutputTokens + requestTokensCount;
      if (sessionTotalTokens > maxTokensTotal) {
        throw new Error(
          `Exceeded max total tokens sent/received to/from the API in this session. ${sessionTotalTokens}/${maxTokensTotal}`,
        );
      }

      if (!isWithinTokenLimit(fullContents, maxTokensPerRequest)) {
        throw new Error(
          `Exceeded max tokens per request. ${requestTokensCount}/${maxTokensPerRequest}`,
        );
      }

      // send request to openai api
      const response = await openaiClient.chat.completions.create({
        ...completionOptions.openaiConfig,
        messages: conversation,
        stream: false,
      });

      // process response
      if (response.choices[0].finish_reason !== 'stop') {
        throw new Error(`Response 'finish_reason' is not 'stop'`);
      }
      const completion = response.choices[0].message.content;

      if (!response.usage?.total_tokens) {
        throw new Error('response.usage.total_tokens is empty');
      }
      sessionOutputTokens += response.usage.completion_tokens;
      sessionInputTokens += response.usage.prompt_tokens;

      if (!completion) {
        throw new Error('Response message content is empty');
      }
      conversation.push({ role: 'assistant', content: completion });

      return {
        response: completion,
        conversation,
        sessionInputTokens,
        sessionOutputTokens,
      };
    },
    stats: (): SessionStats => {
      return {
        promptCounter,
        sessionInputTokens,
        sessionOutputTokens,
      };
    },
  };
};
