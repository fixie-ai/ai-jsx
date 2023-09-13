import React from 'react';
import Layout from '@theme/Layout';
import { Header } from '../modules/index-header';
import { Sidekick } from '../modules/index-sidekick';
import { Features } from '../modules/index-features';
import { ExampleScroller } from '../modules/index-examples';
import Community from '../modules/index-community';
import { Section } from '../components/Section';

export default function Home() {
  return (
    <Layout title="AI.JSX" description="AI.JSX Landing Page">
      <Header />
      <Features />
      <Sidekick />
      <ExampleScroller />
      <Section>
        <Community />
      </Section>
    </Layout>
  );
}
