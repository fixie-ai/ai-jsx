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
  // tutorialSidebar: [{ type: 'autogenerated', dirName: '.' }],

  // But you can create a sidebar manually
  apiSidebar: [{ type: 'autogenerated', dirName: 'api' }],
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Sidekick Tutorials',
      collapsible: true,
      collapsed: false,
      items: [
        'tutorial/sidekick tutorial/part1-intro',
        'tutorial/sidekick tutorial/part2-next',
      ],
    },
    {
        type: 'category',
        label: 'Other Tutorials',
        collapsible: true,
        collapsed: false,
        items: [
          'tutorial/part1-completion',
          'tutorial/part2-inline',
          'tutorial/part3-constrained-output',
          'tutorial/part4-docsqa',
          'tutorial/part5-nextjs',
          'tutorial/part6-router',
          'tutorial/part7-tools',
        ],
    }
  ],
  docsSidebar: [
    'aboutAIJSX',
    'getting-started',
    'guides/brand-new',
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
      items: [
        'contributing/index',
        'contributing/working-in-the-repo',
      ],
  },

    'changelog',
  ],
};

module.exports = sidebars;
