// import { createLogger, LogLevel } from './logger';

// jest.mock('chalk', () => ({
//   __esModule: true,
//   default: {
//     gray: (str: string) => str,
//     cyan: (str: string) => str,
//     yellow: (str: string) => str,
//     red: (str: string) => str,
//     magenta: (str: string) => str,
//     hex: () => (str: string) => str,
//   },
// }));

// const MOCK_ISO_TIMESTAMP = '2025-10-08T15:00:00.000Z';

// jest.mock('dayjs', () => ({
//   __esModule: true,
//   default: jest.fn(() => ({
//     toISOString: jest.fn().mockReturnValue(MOCK_ISO_TIMESTAMP),
//   })),
// }));

// jest.mock('./config', () => ({
//   getConfiguredLogLevel: jest.fn(),
// }));

// describe('Logger Utility', () => {
//   let consoleLogSpy: jest.SpyInstance;
//   let consoleWarnSpy: jest.SpyInstance;
//   let consoleErrorSpy: jest.SpyInstance;
//   const originalEnv = process.env;

//   beforeEach(() => {
//     consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
//     consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
//     consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
//     process.env = { ...originalEnv };
//   });

//   afterEach(() => {
//     jest.restoreAllMocks();
//     process.env = originalEnv;
//   });

//   describe('Logger Output', () => {
//     it('should format an DEBUG log message correctly', () => {
//       (getConfiguredLogLevel as jest.Mock).mockReturnValue(LogLevel.DEBUG);
//       const logger = createLogger('UTIL');
//       logger.debug('Calling api');

//       const expectedOutput = `[DEBUG] ${MOCK_ISO_TIMESTAMP} (UTIL) Calling api`;
//       expect(consoleLogSpy).toHaveBeenCalledWith(expectedOutput);
//     });

//     it('should format an INFO log message correctly', () => {
//       (getConfiguredLogLevel as jest.Mock).mockReturnValue(LogLevel.INFO);
//       const logger = createLogger('API');
//       logger.info('User logged in');

//       const expectedOutput = `[INFO] ${MOCK_ISO_TIMESTAMP} (API) User logged in`;
//       expect(consoleLogSpy).toHaveBeenCalledWith(expectedOutput);
//     });

//     it('should format a WARN log message and call console.warn', () => {
//       (getConfiguredLogLevel as jest.Mock).mockReturnValue(LogLevel.WARN);
//       const logger = createLogger('DB');
//       logger.warn('Connection timeout');

//       const expectedOutput = `[WARN] ${MOCK_ISO_TIMESTAMP} (DB) Connection timeout`;
//       expect(consoleWarnSpy).toHaveBeenCalledWith(expectedOutput);
//     });
  
//     it('should format an ERROR log message with context and call console.error', () => {
//       (getConfiguredLogLevel as jest.Mock).mockReturnValue(LogLevel.ERROR);
//       const logger = createLogger('PaymentGateway');
//       const errorContext = { transactionId: 'txn_123', code: 503 };
//       logger.error('Payment failed', errorContext);
  
//       const expectedOutput = `[ERROR] ${MOCK_ISO_TIMESTAMP} (PaymentGateway) Payment failed\n${JSON.stringify(errorContext, null, 2)}`;
//       expect(consoleErrorSpy).toHaveBeenCalledWith(expectedOutput);
//     });

//     it('should not log messages below the configured level', () => {
//       (getConfiguredLogLevel as jest.Mock).mockReturnValue(LogLevel.WARN);
//       const logger = createLogger('Main');
//       logger.debug('This is a debug message');
//       logger.info('This is an info message');
      
//       expect(consoleLogSpy).not.toHaveBeenCalled();
      
//       logger.warn('This is a warning');
//       expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
//     });
//   });
// });
