import React, { useCallback, useEffect, useState } from 'react';
import useWindowWidth from '../../theme/useWindowWidth';
import clsx from 'clsx';
import Highlight from '../../components/Highlight';
import Chevron from '../../theme/Chevron';
import seCss from '../../css/section.module.css';
import shCss from '../../css/index/showcase.module.css';
import LLMPromptingIcon from '../../assets/img/pages/index/llmPrompting.svg';
import DocsQAIcon from '../../assets/img/pages/index/docsQA.svg';
import ToolsIcon from '../../assets/img/pages/index/tools.svg';
import GenUIIcon from '../../assets/img/pages/index/genUI.svg';
import SvgImage from '../../components/SvgImage';

const S = [3, 1, 6, 10];
const M = [3, 0, 4, 8];
const L = [4, 0, 4, 8];

const getTopByIndex = (m: number[], index: 1 | 2 | 3 | 4): number => {
  const scale = {
    1: 25 * (m[0] ?? 0),
    2: -25 * (m[1] ?? 0),
    3: -25 * (m[2] ?? 0),
    4: -25 * (m[3] ?? 0),
  };

  return scale[index] ?? 0;
};

const promptingJSXCode = `<SystemMessage>
  <Prompt persona="expert customer service agent for Fixie" />
  You have access to the Fixie customer support docs...
</SystemMessage>`;

const docsQAJSXCode = `lookUpFixieKnowledgeBase: {
  description: 'Look up information about Fixie from its
  customer support and developer docs'
  ...
}`;

const toolsJSXCode = `tools: Record<string, Tool> = {
  listIssues: {
    description: 'List issues from Github and Discord',
    func: async function () {
      return fetchAPI('issues')
    }
  }
}`;

const genUIJSXCode = `export const mdxUsageExamples = <>
When you list users, use the <ListUsers /> component.`;

type Index = 1 | 2 | 3 | 4;

export const ExampleScroller = () => {
  const [top, setTop] = useState(S);
  const [index, setIndex] = useState<Index>(2);
  const windowWidth = useWindowWidth();
  const handleClick1 = useCallback(() => {
    setIndex(1);
  }, []);
  const handleClick2 = useCallback(() => {
    setIndex(2);
  }, []);
  const handleClick3 = useCallback(() => {
    setIndex(3);
  }, []);
  const handleClick4 = useCallback(() => {
    setIndex(4);
  }, []);
  const handleUpClick = useCallback(() => {
    setIndex(Math.max(index - 1, 1) as Index);
  }, [index]);
  const handleDownClick = useCallback(() => {
    setIndex(Math.min(index + 1, 4) as Index);
  }, [index]);

  useEffect(() => {
    if (windowWidth != null && windowWidth < 622) {
      setTop(S);
      return;
    }

    if (windowWidth != null && windowWidth < 800) {
      setTop(M);
      return;
    }

    setTop(L);
  }, [windowWidth]);

  return (
    <section
      className={clsx(seCss.section, seCss['section--inner'], seCss['section--center'], seCss['section--showcase'])}
    >
      <h2 className={clsx(seCss.section__title, seCss['section__title--wide'], 'text--center')}>
        Powerful JSX Components
      </h2>

      <p className={clsx(seCss.section__subtitle, seCss['section__subtitle--narrow'], 'text--center')}>
        Create JSX components for all your conversational AI app needs.
      </p>

      <div className={shCss.showcase}>
        <div className={shCss.showcase__inner}>
          <div
            className={clsx(shCss.showcase__chevron)}
            onClick={handleUpClick}
            style={{ visibility: index === 1 ? 'hidden' : 'visible' }}
          >
            <Chevron />
          </div>
          <div className={clsx(shCss.showcase__left)}>
            <div
              className={clsx(shCss.showcase__offset, shCss[`showcase__${index}`])}
              style={{ top: getTopByIndex(top, index) }}
            >
              <Highlight code={promptingJSXCode} />
              <Highlight code={`-- LLM Prompting\n${promptingJSXCode}`} />
              <Highlight code={docsQAJSXCode} />
              <Highlight code={`-- DocsQA\n${docsQAJSXCode}`} />
              <Highlight code={toolsJSXCode} />
              <Highlight code={`-- Tools\n${toolsJSXCode}`} />
              <Highlight code={genUIJSXCode} />
              <Highlight code={`-- GenUI\n${genUIJSXCode}`} />
            </div>
          </div>
          <div
            className={clsx(shCss.showcase__chevron, shCss['showcase__chevron--bottom'])}
            onClick={handleDownClick}
            style={{ visibility: index === 4 ? 'hidden' : 'visible' }}
          >
            <Chevron />
          </div>
          <div className={shCss.showcase__right}>
            <div
              className={clsx(shCss.showcase__button, {
                [shCss['showcase__button--active']]: index === 1,
              })}
              onClick={handleClick1}
            >
              <h3 className={shCss.showcase__header}>
                <SvgImage image={<LLMPromptingIcon className={shCss.showcase__icon} />} title="Magnifying glass icon" />
                LLM Prompting
              </h3>
              <p className={shCss.showcase__description}>Create prompts via components.</p>
            </div>

            <div
              className={clsx(shCss.showcase__button, {
                [shCss['showcase__button--active']]: index === 2,
              })}
              onClick={handleClick2}
            >
              <h3 className={shCss.showcase__header}>
                <SvgImage image={<DocsQAIcon className={shCss.showcase__icon} />} title="Knife icon" />
                DocsQA
              </h3>
              <p className={shCss.showcase__description}>Give the LLM new knowledge from your docs and URLs.</p>
            </div>

            <div
              className={clsx(shCss.showcase__button, {
                [shCss['showcase__button--active']]: index === 3,
              })}
              onClick={handleClick3}
            >
              <h3 className={shCss.showcase__header}>
                <SvgImage image={<ToolsIcon className={shCss.showcase__icon} />} title="Indication arrow icon" />
                Tools
              </h3>
              <p className={shCss.showcase__description}>Give the LLM a tool for listing mailboxes.</p>
            </div>
            <div
              className={clsx(shCss.showcase__button, { [shCss['showcase__button--active']]: index === 4 })}
              onClick={handleClick4}
            >
              <h3 className={shCss.showcase__header}>
                <SvgImage image={<GenUIIcon className={shCss.showcase__icon} />} title="Two overlapping squares" />
                GenUI
              </h3>
              <p className={shCss.showcase__description}>Move from text-only to fully visual output.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
