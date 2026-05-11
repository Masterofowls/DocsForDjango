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

  url: "http://localhost",
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
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/django-social-card.jpg",
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
