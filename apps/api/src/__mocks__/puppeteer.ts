import { jest } from '@jest/globals';
type AnyFn = (...args: any[]) => any;
export const launch = jest.fn<AnyFn>().mockResolvedValue({
  newPage: jest.fn<AnyFn>().mockResolvedValue({
    goto: jest.fn<AnyFn>(),
    content: jest.fn<AnyFn>().mockResolvedValue('<html></html>'),
    close: jest.fn<AnyFn>(),
  }),
  close: jest.fn<AnyFn>(),
});

export default { launch };
