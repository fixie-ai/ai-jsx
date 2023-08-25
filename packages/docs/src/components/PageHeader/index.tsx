import React from 'react';
import { Section } from '../Section';
import styles from './styles.module.css';

export const PageHeader = () => {
  return (
    <Section fullWidth left>
      <div className={styles.titles}>
        <Section.Title level={1} className={styles.header}>
          Conversational AI Apps.<br />Built in React.
        </Section.Title>

        <Section.Subtitle className={styles.subheader} left>
          AI.JSX is a framework for building AI applications using Javascript and JSX. You get great support for prompt
          engineering, Document Question + Answering, and using external Tools (APIs). You can provide a set of React
          components to the LLM and have your UI constructed dynamically at runtime (AKA GenUI). Bring all these to life 
          in a Sidekick or use them as building blocks in other apps.
          {/* <br /><br />
          Bacon ipsum dolor amet chislic tri-tip hamburger lorem, chicken doner t-bone. Eu shank biltong, velit chicken
          tri-tip proident esse pork loin ball tip. Non turkey reprehenderit, eiusmod nulla consequat boudin short loin
          minim. Doner flank porchetta, jerky cillum pork beef. Dolore velit ham, consequat chicken strip steak biltong
          ut. */}
        </Section.Subtitle>
      </div>
    </Section>
  );
};
