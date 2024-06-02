import { describeWorkspace } from './index';

describe('cdk lib', () => {
  it('lib exported', () => {
    expect(describeWorkspace).toBeDefined();
  });
});
