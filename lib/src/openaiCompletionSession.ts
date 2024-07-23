/* eslint-disable camelcase */
import fs from 'fs';
import path from 'path';

import { encode, isWithinTokenLimit } from 'gpt-tokenizer';
import { OpenAI } from 'openai';

import {
  CompletionOptions,
  Message,
  OpenAICompletionSession,
  SendPromptResponse,
  SessionStats,
} from './types';
import { defaultValue } from './utils';

export const createOpenAICompletionSession = (
  openaiClient: OpenAI,
  completionOptions: CompletionOptions,
): OpenAICompletionSession => {
  // start new conversation
  let conversation: Message[] = [
    { role: 'system', content: 'You are an AI assistant that helps people find information.' },
  ];
  let promptCounter = 0;

  const maxPrompts = defaultValue(completionOptions.maxPrompts, 5);
  const maxTokensPerRequest = defaultValue(completionOptions.maxTokensPerRequest, 4000);
  const maxTokensTotal = defaultValue(completionOptions.maxTokensTotal, 12000);

  let sessionInputTokens = 0;
  let sessionOutputTokens = 0;

  return {
    sendPrompt: async (prompt: string): Promise<SendPromptResponse> => {
      let lastFinishReason = '';
      let messageContents = '';

      // re-send prompts until the response is completed (reason!='length')
      do {
        // check max prompts
        promptCounter += 1;
        if (promptCounter > maxPrompts) {
          throw new Error(`Too many prompts in this session (${promptCounter}/${maxPrompts})`);
        }

        // send user message only in the first prompt pass
        // after the first time in this loop, the requests are for completing fragmented response continuation (reason='length')
        if (!lastFinishReason) {
          conversation.push({ role: 'user', content: prompt });
        } else {
          // TODO pass logger as parameter
          // eslint-disable-next-line no-console
          console.log('Continuing response...');
          // conversation.push({ role: 'user', content: 'continue' });
        }

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
        // eslint-disable-next-line no-await-in-loop
        const response = await openaiClient.chat.completions.create({
          ...completionOptions.openaiConfig,
          messages: [...conversation], // cloning is used so we can test "toHaveBeenCalledWith" with the correct data
          stream: false,
        });

        lastFinishReason = response.choices[0].finish_reason;

        const completion = response.choices[0].message.content;
        if (completion) {
          // TODO alert: in some cases this corrupts file contents, but we don't know
          // how to deal with it in a better way as it seems that it stops in tokens and we can't know which is the separator of the token
          // between responses, add a space because the various APIs calls
          // ends with tokens, which means that between the last token of one response
          // and the first token of the next response we don't really know if there
          // is a space, \n or \t separating them
          // messageContents += `${messageContents ? ' ' : ''}${completion}`;
          messageContents += completion;
        }

        if (!response.usage?.total_tokens) {
          throw new Error('response.usage.total_tokens is empty');
        }
        sessionOutputTokens += response.usage.completion_tokens;
        sessionInputTokens += response.usage.prompt_tokens;

        if (!completion) {
          throw new Error('Response message content is empty');
        }
        conversation.push({ role: 'assistant', content: completion });
      } while (lastFinishReason === 'length');

      return {
        response: messageContents,
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
    saveConversation: (file: string): void => {
      const data = JSON.stringify(conversation, null, 2);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, data, 'utf8');
    },
    loadConversation: (file: string): void => {
      // load existing conversation from file
      if (!fs.existsSync(file)) {
        throw new Error(`conversationFile "${file}" doesn't exist`);
      }
      const data = fs.readFileSync(file, 'utf8');
      conversation = JSON.parse(data);
    },
    getConversation: (): Message[] => {
      return conversation;
    },
  };
};
