export const defaultValue = <T>(value: T | undefined, defValue: T): T => {
  return typeof value !== 'undefined' ? value : defValue;
};

export const splitComma = (source: string | undefined): string[] => {
  if (typeof source === 'undefined') {
    return [];
  }
  return source.split(/\s*,\s*/g).filter((s) => s.trim() !== '');
};
