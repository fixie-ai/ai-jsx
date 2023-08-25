import footerCss from './developercommunity.module.css';
import ActionCard from '../ActionCard';
import DeveloperIcon from './developer.svg';
import NewsletterIcon from './newsletter.svg';
import React from 'react';
import SvgImage from '../SvgImage';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function DeveloperCommunity(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { title, customFields } = siteConfig;
  return (
    <div className={footerCss.cards}>
      <ActionCard
        icon={<SvgImage image={<DeveloperIcon />} title="An icon showing wave propagation" />}
        title="Join our community"
        description="AI.JSX is open source. Follow us on Twitter, star our GitHub repo, and join our developer community on Discord!"
      >
        <a className={footerCss.card__link} href={customFields.gitHubUrl} rel="noopener noreferrer" target="_blank">
          Go to GitHub&nbsp;&nbsp;&gt;
        </a>
        <a className={footerCss.card__link} href={customFields.discordUrl}>
          Join Discord&nbsp;&nbsp;&gt;
        </a>
      </ActionCard>
      <ActionCard
        icon={<SvgImage image={<NewsletterIcon />} title="An icon showing wave propagation" />}
        title="Stay in the loop"
        description="Sign-up for our newsletter. We never spam or share your info. Newsletter guaranteed to include at least one useful thing."
      >
        {/* <a className={footerCss.card__link} href={customFields.gitHubUrl} rel="noopener noreferrer" target="_blank">
          Go to GitHub&nbsp;&nbsp;&gt;
        </a>
        <a className={footerCss.card__link} href={customFields.discordUrl}>
          Join Discord&nbsp;&nbsp;&gt;
        </a> */}
      </ActionCard>
    </div>
  );
}
