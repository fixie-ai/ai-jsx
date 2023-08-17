import React from 'react';

// import clsx from 'clsx';
// import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import Link from '@docusaurus/Link';
import Translate, { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl, { useBaseUrlUtils } from '@docusaurus/useBaseUrl';

// import Image from '@theme/IdealImage';
import Layout from '@theme/Layout';
import { PageHeader } from '../components/PageHeader';
import { UseCases } from '../components/UseCases';
import DeveloperCommunity from '../components/DeveloperCommunity';

export default function Home(): JSX.Element {
  const {
    siteConfig: { customFields, tagline },
  } = useDocusaurusContext();
  const { description } = customFields as { description: string };

  return (
    <Layout title={tagline} description={description}>
      <PageHeader />
      <UseCases />
      <DeveloperCommunity />
    </Layout>
  );
}
