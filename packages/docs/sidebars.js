/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  // tutorialSidebar: [{ type: 'autogenerated', dirName: '.' }],         // Old sidebar

  apiSidebar: [{ type: 'autogenerated', dirName: 'api' }],
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Sidekicks',
      collapsible: true,
      collapsed: false,
      items: [
        'sidekicks/sidekicks-quickstart',
        'sidekicks/sidekicks-docsqa',
        // Start Sidekicks Tutorials
        {
          type: 'category',
          label: 'Sidekicks Tutorial',
          collapsible: true,
          collapsed: true,
          items: [
            'tutorials/sidekickTutorial/part1-intro',
            'tutorials/sidekickTutorial/part2-docsQA',
            'tutorials/sidekickTutorial/part3-systemPrompt',
            'tutorials/sidekickTutorial/part4-tools',
            'tutorials/sidekickTutorial/part5-genUI',
            'tutorials/sidekickTutorial/part6-deploying',
            'tutorials/sidekickTutorial/part7-conclusion',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'AI.JSX',
      collapsible: true,
      collapsed: false,
      items: [
        'getting-started',
        'ai-newcomers',
        // Start AI.JSX Tutorials
        {
          type: 'category',
          label: 'AI.JSX Tutorials',
          collapsible: true,
          collapsed: true,
          items: [
            'tutorials/part1-completion',
            'tutorials/part2-inline',
            'tutorials/part3-constrained-output',
            'tutorials/part4-docsqa',
            'tutorials/part5-nextjs',
            'tutorials/part6-router',
            'tutorials/part7-tools',
          ],
        },
      ],
    },
  ],
  docsSidebar: [
    'aboutAIJSX',
    {
      type: 'category',
      label: 'Guides',
      collapsible: true,
      collapsed: true,
      items: [
        'guides/rules-of-jsx',
        'guides/prompting',
        'guides/ai-ui',
        'guides/observability',
        'guides/performance',
        'guides/architecture',
        'guides/audio',
        'guides/docsqa',
        'guides/esm',
        'guides/jsx',
        'guides/mdx',
        'guides/models',
        'guides/rendering',
      ],
    },
    'is-it-langchain',
    'is-it-react',
    {
      type: 'category',
      label: 'Contributing',
      collapsible: true,
      collapsed: true,
      items: ['contributing/index', 'contributing/working-in-the-repo'],
    },

    'changelog',
  ],
};

module.exports = sidebars;
