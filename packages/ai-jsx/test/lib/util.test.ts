import { getEnvVar } from '../../dist/cjs/lib/util.cjs';

process.env.EXISTS = 'exists';
process.env.REACT_APP_ONLY = 'react-value';

test('env var exists under original name', () => {
  expect(getEnvVar('EXISTS')).toEqual('exists');
});

test('env var exists under react app name', () => {
  expect(getEnvVar('ONLY')).toEqual('react-value');
});

test('env var does not exist', () => {
  expect(() => getEnvVar('DOES_NOT_EXIST')).toThrowError(
    /Please specify env var 'DOES_NOT_EXIST' or 'REACT_APP_DOES_NOT_EXIST'./
  );
});

test('env var does not exist and shouldThrow=false', () => {
  expect(getEnvVar('DOES_NOT_EXIST', false)).toBeUndefined();
});

test('process is not defined', () => {
  const originalProcess = globalThis.process;

  // @ts-expect-error
  delete globalThis.process;

  expect(getEnvVar('DOES_NOT_EXIST', false)).toBeUndefined();

  globalThis.process = originalProcess;
});

test('env is not defined', () => {
  const originalEnv = globalThis.process.env;

  // @ts-expect-error
  delete globalThis.process.env;

  expect(getEnvVar('DOES_NOT_EXIST', false)).toBeUndefined();

  globalThis.process.env = originalEnv;
});
