import { getEnvVar } from '../src/lib/util';

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
