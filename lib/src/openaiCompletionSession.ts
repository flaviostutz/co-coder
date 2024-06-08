/* eslint-disable camelcase */
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
};

export type CompletionOptions = {
  model: openai.ChatModel;
  seed?: number | null;
  temperature?: number | null;
  top_p?: number | null;
  frequency_penalty?: number | null;
  presence_penalty?: number | null;
  max_tokens?: number | null;
  stop?: string | null;
};

export const createOpenAICompletionSession = (
  openaiClient: OpenAI,
  completionOptions: CompletionOptions,
): OpenAICompletionSession => {
  const conversation: Message[] = [
    { role: 'system', content: 'You are an AI assistant that helps people find information.' },
  ];

  return {
    sendPrompt: async (prompt: string): Promise<SendPromptResponse> => {
      conversation.push({ role: 'user', content: prompt });

      const response = await openaiClient.chat.completions.create({
        ...completionOptions,
        messages: conversation,
        stream: false,
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('Response message content is empty');
      }
      conversation.push({ role: 'assistant', content: completion });
      return {
        response: completion,
        conversation,
      };
    },
  };
};
