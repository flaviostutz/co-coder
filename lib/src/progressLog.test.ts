import { debug, info, trace, ProgressLogFunc } from './progressLog';

describe('progressLog', () => {
  let logFunc: ProgressLogFunc;

  beforeEach(() => {
    logFunc = jest.fn();
  });

  it('should call logFunc with message when debug is called', () => {
    const message = 'debug message';
    debug(message, logFunc, 'debug');
    expect(logFunc).toHaveBeenCalledWith(message);
  });

  it('should call logFunc with message when info is called', () => {
    const message = 'info message';
    info(message, logFunc, 'info');
    expect(logFunc).toHaveBeenCalledWith(message);
  });

  it('should call logFunc with message when trace is called', () => {
    const message = 'trace message';
    trace(message, logFunc, 'trace');
    expect(logFunc).toHaveBeenCalledWith(message);
  });

  it('should not call logFunc when debug is called with lower log level', () => {
    const message = 'debug message';
    debug(message, logFunc, 'info');
    expect(logFunc).not.toHaveBeenCalled();
  });

  it('should not call logFunc when info is called with lower log level', () => {
    const message = 'info message';
    info(message, logFunc, 'off');
    expect(logFunc).not.toHaveBeenCalled();
  });

  it('should not call logFunc when trace is called with lower log level', () => {
    const message = 'trace message';
    trace(message, logFunc, 'debug');
    expect(logFunc).not.toHaveBeenCalled();
  });

  it('should call logFunc when higher level is active', () => {
    const message = 'debug message';
    debug(message, logFunc, 'trace');
    expect(logFunc).toHaveBeenCalled();
  });
});
