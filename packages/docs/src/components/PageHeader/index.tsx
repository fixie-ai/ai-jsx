import React from 'react';
import { Section } from '../Section';
import styles from './styles.module.css';

export const PageHeader = () => {
  return (
    <Section fullWidth center>
      <div className={styles.titles}>
        <Section.Title level={1} className={styles.header}>
          Conversational AI Apps. Built in React.
        </Section.Title>

        <Section.Subtitle className={styles.subheader} center>
          Bacon ipsum dolor amet chislic tri-tip hamburger lorem, chicken doner t-bone. Eu shank biltong, velit chicken
          tri-tip proident esse pork loin ball tip. Non turkey reprehenderit, eiusmod nulla consequat boudin short loin
          minim. Doner flank porchetta, jerky cillum pork beef. Dolore velit ham, consequat chicken strip steak biltong
          ut.
        </Section.Subtitle>
      </div>
    </Section>
  );
};
