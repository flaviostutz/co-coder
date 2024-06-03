import { promptFileContents } from './index';

describe('cdk lib', () => {
  it('lib exported', () => {
    expect(promptFileContents).toBeDefined();
  });
});
