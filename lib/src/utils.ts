export const defaultValue = <T>(value: T | undefined, defValue: T): T => {
  return typeof value !== 'undefined' ? value : defValue;
};
