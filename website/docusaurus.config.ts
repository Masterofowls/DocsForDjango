import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: "Django Mastery Docs",
  tagline: "From installation to production — the complete Django reference.",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  url: 'https://website-daniel-shterns-projects.vercel.app',
  baseUrl: "/",

  organizationName: "mrdan",
  projectName: "django-mastery-docs",

  onBrokenLinks: "warn",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "docs",
          showLastUpdateTime: false,
          showLastUpdateAuthor: false,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'reactDocs',
        path: 'react-docs',
        routeBasePath: 'react',
        sidebarPath: './react-sidebars.ts',
        showLastUpdateTime: false,
        showLastUpdateAuthor: false,
      },
    ],
    [
      '@docusaurus/plugin-pwa',
      {
        debug: false,
        swCustom: '../../../../src/pwa/sw-custom.js',
        offlineModeActivationStrategies: [
          'appInstalled',
          'standalone',
          'queryString',
        ],
      },
    ],
  ],

  themeConfig: {
    image: "img/django-social-card.jpg",
    metadata: [
      {name: 'theme-color', content: '#0c4b33'},
      {name: 'mobile-web-app-capable', content: 'yes'},
      {name: 'apple-mobile-web-app-capable', content: 'yes'},
      {name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'},
      {name: 'application-name', content: 'Django & React Mastery'},
      {name: 'apple-mobile-web-app-title', content: 'Django & React Mastery'},
      {name: 'msapplication-TileColor', content: '#0c4b33'},
    ],
    pwa: {
      offlineModeActivationStrategies: ['appInstalled', 'standalone', 'queryString'],
      pwaHead: [
        {
          tagName: 'link',
          rel: 'icon',
          href: '/img/icon-192.png',
        },
        {
          tagName: 'link',
          rel: 'manifest',
          href: '/manifest.webmanifest',
        },
        {
          tagName: 'link',
          rel: 'apple-touch-icon',
          href: '/img/apple-touch-icon.png',
        },
        {
          tagName: 'meta',
          name: 'theme-color',
          content: '#0c4b33',
        },
        {
          tagName: 'meta',
          name: 'msapplication-config',
          content: '/browserconfig.xml',
        },
      ],
    },
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: "Django Mastery",
      logo: {
        alt: "Django Logo",
        src: "img/logo.svg",
        srcDark: "img/logo-dark.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "djangoSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          to: "/docs/installation-and-tooling",
          label: "Quick Start",
          position: "left",
        },
        {
          type: 'docSidebar',
          docsPluginId: 'reactDocs',
          sidebarId: 'reactSidebar',
          position: 'left',
          label: 'React Advanced',
        },
        {
          type: "search",
          position: "right",
        },
      ],
      hideOnScroll: false,
      style: "dark",
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Core",
          items: [
            { label: "Installation", to: "/docs/installation-and-tooling" },
            {
              label: "Project Structure",
              to: "/docs/project-structure-and-apps",
            },
            { label: "Settings", to: "/docs/settings-and-environments" },
          ],
        },
        {
          title: "Data & Auth",
          items: [
            { label: "Models & ORM", to: "/docs/models-and-orm-basics" },
            {
              label: "Users & Permissions",
              to: "/docs/users-auth-and-permissions",
            },
            {
              label: "REST Framework",
              to: "/docs/django-rest-framework-deep-dive",
            },
          ],
        },
        {
          title: "Production",
          items: [
            { label: "Deployment", to: "/docs/deployment-and-operations" },
            { label: "Security", to: "/docs/security-hardening" },
            { label: "Testing", to: "/docs/testing-strategy" },
          ],
        },
        {
          title: "Tutorials",
          items: [
            { label: "Build a Posts App", to: "/docs/building-posts-app" },
            {
              label: "Build an E-Commerce App",
              to: "/docs/building-orders-and-ecommerce",
            },
            { label: "Build a Chat App", to: "/docs/building-chat-app" },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Django Docs",
              href: "https://docs.djangoproject.com",
            },
            {
              label: "Django REST Framework",
              href: "https://www.django-rest-framework.org",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Django Mastery Docs. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneDark,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["python", "bash", "sql", "toml", "groovy", "nginx"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
