import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const features = [
  {
    title: 'DocsQA',
    uses: [
      'Ground the model in sources of truth',
      'URLs, documents, PDFs',
      'Video and audio files',
      'Fully hosted or bring your own',
    ],
    cta: {
      label: 'Try DocsQA Now',
      url: '/docsqa/',
    },
  },
  {
    title: 'Tools',
    uses: ['Give your app new capabilities', 'Action-oriented through APIs', 'Enable end-users to close the loop'],

    cta: {
      label: 'More on Tools',
      url: '/tools/',
    },
  },
  {
    title: 'GenUI',
    uses: ['Move beyond simple text chat', 'JSX components enable the LLM to build UI dynamically at runtime'],

    cta: {
      label: 'See GenUI In Action',
      url: '/genUI/',
    },
  },
];

export const Features = () => (
  <div className={styles.root}>
    {features.map(({ title, uses, cta }, index) => (
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