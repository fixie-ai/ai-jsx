import ActionCard from '../../components/ActionCard';
import DeveloperIcon from '../../assets/img/pages/index/developer.svg';
import NewsletterIcon from '../../assets/img/pages/index/newsletter.svg';
import React from 'react';
import SvgImage from '../../components/SvgImage';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from "./styles.module.css"

export default function Community(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { title, customFields } = siteConfig;
  return (
    <div className={styles.cards}>
      <ActionCard
        icon={<SvgImage image={<DeveloperIcon />} title="An icon showing wave propagation" />}
        title="Join our community"
        description="AI.JSX is open source. Follow us on Twitter, star our GitHub repo, and join our developer community on Discord!"
      >
        <a className={styles.card__link} href={customFields.gitHubUrl} rel="noopener noreferrer" target="_blank">
          Go to GitHub&nbsp;&nbsp;&gt;
        </a>
        <a className={styles.card__link} href={customFields.discordUrl}>
          Join Discord&nbsp;&nbsp;&gt;
        </a>
      </ActionCard>
      <ActionCard
        icon={<SvgImage image={<NewsletterIcon />} title="An icon showing wave propagation" />}
        title="Stay in the loop"
        description="Sign-up for our newsletter. We never spam or share your info. Newsletter guaranteed to include at least one useful thing."
      >
      </ActionCard>
    </div>
  );
}