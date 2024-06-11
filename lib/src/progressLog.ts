export type ProgressLogFunc = (message: string) => void;

export type ProgressLogLevel = 'off' | 'info' | 'debug' | 'trace';

export const debug = (
  message: string,
  logFunc?: ProgressLogFunc,
  logFuncLevel?: ProgressLogLevel,
): void => {
  log(message, 'debug', logFunc, logFuncLevel);
};

export const info = (
  message: string,
  logFunc?: ProgressLogFunc,
  logFuncLevel?: ProgressLogLevel,
): void => {
  log(message, 'info', logFunc, logFuncLevel);
};

export const trace = (
  message: string,
  logFunc?: ProgressLogFunc,
  logFuncLevel?: ProgressLogLevel,
): void => {
  log(message, 'trace', logFunc, logFuncLevel);
};

export const log = (
  message: string,
  msgLevel: ProgressLogLevel,
  logFunc?: ProgressLogFunc,
  logFuncLevel?: ProgressLogLevel,
): void => {
  const logFuncLevelNumber = progressLogLevelToNumber(logFuncLevel);
  const messageLogLevelNumber = progressLogLevelToNumber(msgLevel);
  if (logFunc) {
    if (logFuncLevel === 'off') {
      return;
    }
    if (messageLogLevelNumber <= logFuncLevelNumber && message) {
      logFunc(message);
    }
  }
};

const progressLogLevelToNumber = (level?: ProgressLogLevel): number => {
  if (!level) {
    return 0;
  }
  switch (level) {
    case 'off':
      return 0;
    case 'info':
      return 1;
    case 'debug':
      return 2;
    case 'trace':
      return 3;
    default:
      return 1;
  }
};
