import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { disableGeminiThinking } from './model-manager.service';

describe('disableGeminiThinking', () => {
  const realFetch = global.fetch;
  let sentBody: Record<string, unknown> | undefined;

  beforeEach(() => {
    sentBody = undefined;
    global.fetch = jest.fn((_url: unknown, init?: { body?: unknown }) => {
      sentBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: { role: 'model', parts: [{ text: '{}' }] },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sends a zero thinking budget for gemini-2.5-flash', async () => {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: 'test',
      modelName: 'gemini-2.5-flash',
      maxRetries: 0,
    });
    disableGeminiThinking(llm, 'gemini-2.5-flash');

    await llm.invoke('hi');

    expect(sentBody?.generationConfig).toMatchObject({
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it('leaves other models alone', async () => {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: 'test',
      modelName: 'gemini-2.0-flash',
      maxRetries: 0,
    });
    disableGeminiThinking(llm, 'gemini-2.0-flash');

    await llm.invoke('hi');

    expect(sentBody?.generationConfig).not.toHaveProperty('thinkingConfig');
  });
});
