import React from 'react';

import Prism, { defaultProps } from 'prism-react-renderer';

import DarkTheme from '../../internals/prism-dracula';
import LightTheme from '../../internals/prism-github';

const themes = {
  light: LightTheme,
  dark: DarkTheme,
};

const Highlight = ({ code, theme = 'dark' }: { code: string; theme?: 'light' | 'dark' }) => (
  <div>
    {/* @ts-expect-error missing type for language "questdb-sql". We know it exists but Prism does not provide such type */}
    <Prism {...defaultProps} language="questdb-sql" code={code} theme={themes[theme]}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={className} style={style}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Prism>
  </div>
);

export default Highlight;
