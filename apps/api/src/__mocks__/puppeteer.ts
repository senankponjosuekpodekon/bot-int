export const launch = jest.fn().mockResolvedValue({
  newPage: jest.fn().mockResolvedValue({
    goto: jest.fn(),
    content: jest.fn().mockResolvedValue('<html></html>'),
    close: jest.fn(),
  }),
  close: jest.fn(),
});

export default { launch };
