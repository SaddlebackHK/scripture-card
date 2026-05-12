export const assertNever = (value: never): never => {
  throw new Error(`Unreachable case reached: ${JSON.stringify(value)}`);
};
