import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const useCases = [
  {
    title: 'Build Sidekicks',
    uses: [
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
    ],
    cta: {
      label: 'Start Building',
      url: '/sidekicks/',
    },
  },
  {
    title: 'DocsQA',
    uses: [
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
    ],
    cta: {
      label: 'Try DocsQA Now',
      url: '/docsqa/',
    },
  },
  {
    title: 'Tools',
    uses: [
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
    ],

    cta: {
      label: 'More on Tools',
      url: '/tools/',
    },
  },
  {
    title: 'GenUI',
    uses: [
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
      'Bacon ipsum dolor amet chislic tri-tip',
    ],

    cta: {
      label: 'See GenUI In Action',
      url: '/genUI/',
    },
  },
];

export const UseCases = () => (
  <div className={styles.root}>
    {useCases.map(({ title, uses, cta }, index) => (
      <div className={styles.card} key={index}>
        <h2>{title}</h2>

        <ul className={styles.list}>
          {uses.map((use, index) => (
            <li key={index} className={styles.listItem}>
              {use}
            </li>
          ))}
        </ul>

        <Link className={styles.link} href={cta.url}>
          {cta.label}
        </Link>
      </div>
    ))}
  </div>
);
