import { getEnvVar, patchedUntruncateJson } from '../../dist/cjs/lib/util.cjs';

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

test('Basic untrucation of JSON', () => {
  expect(patchedUntruncateJson('{"a":')).toEqual('{}');
  expect(patchedUntruncateJson('{"a":"b')).toEqual('{"a":"b"}');
  expect(patchedUntruncateJson('{"a":"b"')).toEqual('{"a":"b"}');
});

test('Partial unicode characters are removed', () => {
  expect(patchedUntruncateJson('{"a":"\\u5728\\u5fA"}')).toEqual('{"a":"\\u5728"}');
  expect(patchedUntruncateJson('"\\u5728\\u')).toEqual('"\\u5728"');
  expect(patchedUntruncateJson('"\\u5728\\u0')).toEqual('"\\u5728"');
  expect(patchedUntruncateJson('"\\u5728\\u5fA"')).toEqual('"\\u5728"');
});

test('Unicode characters are allowed', () => {
  expect(patchedUntruncateJson('{"a":"\\u5728什么是"}')).toEqual('{"a":"\\u5728什么是"}');
});
