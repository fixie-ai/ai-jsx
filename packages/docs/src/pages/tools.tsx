import React from 'react';
import Layout from '@theme/Layout';
import { Section } from '../components/Section';
import styles from './subpages.module.css';

export default function Tools() {
  return (
    <Layout title="Tools" description="Overview of Tools in AI.JSX.">
      <Section fullWidth left>
        <div className={styles.titles}>
          <Section.Title level={1} className={styles.header}>
            Tools
          </Section.Title>

          <Section.Subtitle className={styles.subheader} left>
            Bacon ipsum dolor amet chislic tri-tip hamburger lorem, chicken doner t-bone. Eu shank biltong, velit
            chicken tri-tip proident esse pork loin ball tip. Non turkey reprehenderit, eiusmod nulla consequat boudin
            short loin minim. Doner flank porchetta, jerky cillum pork beef. Dolore velit ham, consequat chicken strip
            steak biltong ut.
          </Section.Subtitle>
        </div>
      </Section>
    </Layout>
  );
}