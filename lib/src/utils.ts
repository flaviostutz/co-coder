export const defaultValue = <T>(value: T | undefined, defValue: T): T => {
  return typeof value !== 'undefined' ? value : defValue;
};

export const defaultValueNumber = (value: unknown | undefined, defValue: number): number => {
  return typeof value !== 'undefined' ? parseInt(`${value}`, 10) : defValue;
};

export const defaultValueBoolean = (value: unknown | undefined, defValue: boolean): boolean => {
  return typeof value !== 'undefined' ? `${value}` === 'true' : defValue;
};

export const splitComma = (source: string | undefined): string[] => {
  if (typeof source === 'undefined') {
    return [];
  }
  return source.split(/\s*,\s*/g).filter((s) => s.trim() !== '');
};
