import React from 'react';
import { Section } from '../Section';
import styles from './styles.module.css';
import SKFlowImage from '../../assets/img/pages/index/sidekickFlow.svg';
import SvgImage from '../SvgImage';
import Link from '@docusaurus/Link';
import ActionCard from '../ActionCard';

export const Sidekicks = () => {
  return (
    <Section>
      <div className={styles.titles}>
        <Section.Title level={1} className={styles.header} center>
          Your App Needs a Sidekick
        </Section.Title>

        <Section.Subtitle className={styles.subheader} left>
          AI.JSX enables you to easily create Sidekicks, embeddable conversational assistants that live alongside your
          application. Sidekicks harness the power of DocsQA, Tools, and GenUI and bring everything together in a
          seamless experience.
        </Section.Subtitle>

        <Section.Subtitle className={styles.subheader} left>
          <Link to="/sidekicks/">
            <ActionCard
              icon={<SvgImage image={<SKFlowImage />} title="An icon showing a conversational sidekick" />}
              title="Start Building a Sidekick"
              description=""
            ></ActionCard>
          </Link>
        </Section.Subtitle>
      </div>
    </Section>
  );
};
