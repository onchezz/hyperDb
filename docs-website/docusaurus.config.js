// @ts-check

const { themes } = require('prism-react-renderer')
const { version } = require('./package.json')

const lightTheme = themes.github
const darkTheme = themes.dracula

const repoOwner = process.env.DOCS_REPO_OWNER || 'onchezz'
const repoName = process.env.DOCS_REPO_NAME || 'hyperDb'
const repoBranch = process.env.DOCS_REPO_BRANCH || 'main'
const explicitBaseUrl = process.env.DOCS_BASE_URL
const inferredBaseUrl =
  repoName.toLowerCase() === `${repoOwner.toLowerCase()}.github.io` ? '/' : `/${repoName}/`

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'HyperTillDB',
  tagline: 'A local-first reactive developer layer built on top of WatermelonDB',
  favicon: 'img/favicon.ico',

  url: `https://${repoOwner}.github.io`,
  baseUrl: explicitBaseUrl || inferredBaseUrl,

  organizationName: repoOwner,
  projectName: repoName,

  trailingSlash: true,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: `https://github.com/${repoOwner}/${repoName}/edit/${repoBranch}/docs/`,
          routeBasePath: '/',
          path: '../docs',
          lastVersion: 'current',
          versions: {
            current: {
              label: `${version}`,
              badge: true,
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/hypertilldb-logo.svg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'HyperTillDB',
      logo: {
        alt: 'HyperTillDB Logo',
        src: 'img/hypertilldb-logo.svg',
      },
      items: [
        {
          type: 'doc',
          position: 'left',
          label: 'Docs',
          docId: 'HyperTillDB/Overview',
        },
        {
          type: 'docsVersionDropdown',
          position: 'left',
        },
        {
          href: `https://github.com/${repoOwner}/${repoName}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'HyperTillDB Overview',
              to: '/HyperTillDB/Overview',
            },
            {
              label: 'API Reference',
              to: '/HyperTillDB/ApiReference',
            },
            {
              label: 'Contributing',
              to: '/CONTRIBUTING',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: `https://github.com/${repoOwner}/${repoName}`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} HyperTillDB.`,
    },
    prism: {
      theme: lightTheme,
      darkTheme,
    },
  },
}

module.exports = config
