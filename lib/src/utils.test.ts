/* eslint-disable no-undefined */
import { defaultValue, splitComma } from './utils';

describe('utils', () => {
  describe('defaultValue', () => {
    it('returns the original value if it is not undefined', () => {
      expect(defaultValue(10, 5)).toBe(10);
      expect(defaultValue('text', 'default')).toBe('text');
    });

    it('returns the default value if the original value is undefined', () => {
      expect(defaultValue(undefined, 5)).toBe(5);
      expect(defaultValue(undefined, 'default')).toBe('default');
    });
  });

  describe('splitComma', () => {
    it('splits a string by commas, ignoring spaces around commas', () => {
      expect(splitComma('apple, banana, cherry')).toEqual(['apple', 'banana', 'cherry']);
      expect(splitComma('apple  ,banana, cherry')).toEqual(['apple', 'banana', 'cherry']);
    });

    it('returns an empty array if the input is undefined', () => {
      expect(splitComma(undefined)).toEqual([]);
    });

    it('handles strings without commas correctly', () => {
      expect(splitComma('apple')).toEqual(['apple']);
    });
    it('handles strings with empty elements', () => {
      expect(splitComma('apple, ')).toEqual(['apple']);
    });
  });
});
