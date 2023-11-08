import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { FloatingFixieEmbed } from 'fixie';

const FixieSidekick = () => {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        return <FloatingFixieEmbed agentId="mdw/ai-jsx" agentSendsGreeting chatTitle="AI.JSX Help Agent" />;
      }}
    </BrowserOnly>
  );
};

export default FixieSidekick;
