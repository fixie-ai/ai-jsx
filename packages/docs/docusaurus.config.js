// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'AI.JSX',
  tagline: 'The Toolkit for building JSX AI Apps',
  favicon: 'img/ai-jsx.svg',

  // Set the production url of your site here
  url: 'https://docs.ai-jsx.com/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'fixie-ai', // Usually your GitHub org/user name.
  projectName: 'ai-jsx', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../ai-jsx/src/index.ts'],
        tsconfig: '../ai-jsx/tsconfig.json',
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/fixie-ai/ai-jsx/tree/main/packages/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        gtag: {
          trackingID: 'G-6EQLTL2L31',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // We'll replace this with our own soon
      //image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'AI.JSX',
        logo: {
          alt: 'AI.JSX Logo',
          src: 'img/ai-jsx-icon.png',
          srcDark: 'img/ai-jsx-icon-dark.png',
          href: 'https://docs.ai-jsx.com/',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/MsKAeKF8kU',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/fixieai?lang=en',
              },
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/ai-jsx',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/fixie-ai/ai-jsx/',
              },
            ],
          },
        ],
        copyright: `Copyright © 2023 Fixie.ai`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      mermaid: {
        theme: {
          light: 'neutral',
          dark: 'dark',
        },
      },
    }),

  themes: [
    ['@docusaurus/theme-mermaid', {}],
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        indexBlog: false,
        highlightSearchTermsOnTargetPage: true,
        docsRouteBasePath: '/',
      }),
    ],
  ],

  markdown: {
    mermaid: true,
  },
};

module.exports = config;
