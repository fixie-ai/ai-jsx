require('dotenv').config();

// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'AI.JSX',
  tagline: 'The Toolkit for building JSX AI Apps',
  favicon: 'img/foxie.png',

  // Set the production url of your site here
  url: process.env.DOCS_URL,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'fixie-ai', // Usually your GitHub org/user name.
  projectName: 'ai-jsx', // Usually your repo name.

  onBrokenLinks: 'warn',
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
        // If you add new public-facing entry points, please ensure that they are listed below
        // so that the published API documentation will include them.
        tsconfig: '../ai-jsx/tsconfig.json',
        sidebar: {
          categoryLabel: 'API Reference',
          collapsed: true,
          position: 20,
          fullNames: true,
        },
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
      colorMode: {
        respectPrefersColorScheme: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      // We'll replace this with our own soon
      //image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'AI.JSX',
        logo: {
          alt: 'AI.JSX Logo',
          src: 'img/foxie.png',
          srcDark: 'img/foxie.png',
          href: process.env.DOCS_URL,
        },
        items: [
          {
            to: 'sidekicks/',
            position: 'left',
            label: 'Learn',
          },
          {
            to: 'aboutAIJSX',
            position: 'left',
            label: 'Docs',
          },
          {
            to: 'api/',
            position: 'left',
            label: 'API',
          },
          {
            href: process.env.GITHUB_URL,
            label: 'GitHub',
            position: 'right',
          },
          {
            href: process.env.DISCORD_URL,
            label: 'Discord',
            position: 'right',
          },
        ],
      },
      footer: {
        logo: {
          alt: 'Fixie Logo',
          src: 'img/foxie-charcoal.svg',
          href: process.env.FIXIE_URL,
          width: 160,
          height: 51,
        },
        style: 'dark',
        links: [
          {
            title: 'Resources',
            items: [
              {
                label: 'Docs',
                href: '/aboutAIJSX/',
              },
              {
                label: 'Learn',
                href: '/aboutAIJSX/',
              },
              {
                label: 'Discord',
                href: process.env.DISCORD_URL,
              },
              {
                label: 'GitHub',
                href: process.env.GITHUB_URL,
              },
              {
                label: 'Releases',
                href: '/changelog',
              },
            ],
          },
          {
            title: 'About Fixie',
            items: [
              {
                label: 'About',
                href: process.env.FIXIE_ABOUT,
              },
              {
                label: 'Blog',
                href: process.env.FIXIE_BLOG,
              },
              {
                label: 'Careers',
                href: process.env.FIXIE_CAREERS,
              },
              {
                label: 'Get in Touch',
                href: 'mailto:hello@fixie.ai',
              },
              {
                label: 'Privacy Policy',
                href: process.env.FIXIE_PRIVACY,
              },
              {
                label: 'Twitter',
                href: process.env.TWITTER_URL,
              },
            ],
          },
        ],
        copyright: process.env.COPYRIGHT_FIXIE,
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
      algolia: {
        appId: '5GCK080THV',
        apiKey: '670cb378da13b7d7f1e90dd51faf2398',
        indexName: 'fixie',
        contextualSearch: false,
        searchPagePath: false,
      },
    }),

  themes: [
    ['@docusaurus/theme-mermaid', {}],
    // [
    //   require.resolve('@easyops-cn/docusaurus-search-local'),
    //   /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
    //   ({
    //     hashed: true,
    //     indexBlog: false,
    //     highlightSearchTermsOnTargetPage: true,
    //     docsRouteBasePath: '/',
    //   }),
    // ],
  ],

  markdown: {
    mermaid: true,
  },

  customFields: {
    gitHubUrl: process.env.GITHUB_URL,
    discordUrl: process.env.DISCORD_URL,
    twitterUrl: process.env.TWITTER_URL,
  },
};

module.exports = config;
