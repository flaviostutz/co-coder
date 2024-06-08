import { workspacePromptRunner } from './workspacePromptRunner';

describe('workspacePromptRunner', () => {
  it('should return a promise', () => {
    const result = workspacePromptRunner('test');
    expect(result).toBeInstanceOf(Promise);
  });

  it('should resolve with the correct value', async () => {
    const expectedValue = 'expected value';
    const result = await workspacePromptRunner('test');
    expect(result).toBe(expectedValue);
  });
});
