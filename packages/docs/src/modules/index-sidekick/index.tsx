import React from 'react';
import Link from '@docusaurus/Link';
import { Section } from '../../components/Section';
import { ActionCard } from '../../components/ActionCard';
import SvgImage from '../../components/SvgImage';
import SKFlowImage from '../../assets/img/pages/index/sidekickFlow.svg';
import styles from './styles.module.css';

export const Sidekick = () => {
  return (
    <Section>
      <div className={styles.titles}>
        <Section.Title level={1} className={styles.header} center>
          Your App Needs a Sidekick.
        </Section.Title>

        <Section.Subtitle className={styles.subheader} left>
          AI.JSX enables you to easily create Sidekicks, embeddable conversational assistants that live alongside your
          application. Sidekicks harness the power of DocsQA, Tools, and GenUI and bring everything together in a
          seamless experience.
        </Section.Subtitle>

        <Section.Subtitle className={styles.subheader} left>
          <Link to="https://fixie.ai/docs/sidekicks/sidekicks-quickstart">
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
