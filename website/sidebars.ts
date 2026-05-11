import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  djangoSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '👋 Introduction',
    },
    {
      type: 'category',
      label: '🚀 Core',
      collapsed: false,
      items: [
        'installation-and-tooling',
        'project-structure-and-apps',
        'settings-and-environments',
        'url-routing',
      ],
    },
    {
      type: 'category',
      label: '🗄️ Data Layer',
      collapsed: false,
      items: [
        'models-and-orm-basics',
        'advanced-orm-and-relations',
        'transactions-and-multi-db',
        'external-databases',
      ],
    },
    {
      type: 'category',
      label: '🌐 Web Layer',
      collapsed: false,
      items: [
        'views-fbv-and-cbv',
        'templates-and-static-assets',
        'forms-and-validation',
        'advanced-url-routing',
        'styling-with-tailwind-and-css',
      ],
    },
    {
      type: 'category',
      label: '🔐 Auth & Admin',
      collapsed: false,
      items: [
        'users-auth-and-permissions',
        'django-admin-customization',
        'external-auth-and-django-allauth',
      ],
    },
    {
      type: 'category',
      label: '⚙️ Application Lifecycle',
      items: [
        'middleware-and-signals',
        'management-commands',
      ],
    },
    {
      type: 'category',
      label: '🔌 APIs, Async & Realtime',
      items: [
        'django-rest-framework',
        'django-rest-framework-deep-dive',
        'async-celery-background-jobs',
        'websockets-with-channels',
      ],
    },
    {
      type: 'category',
      label: '📁 Media & Files',
      items: [
        'uploading-and-media-files',
        'importing-data-csv-excel',
      ],
    },
    {
      type: 'category',
      label: '🛒 Practical Tutorials',
      items: [
        'building-posts-app',
        'building-orders-and-ecommerce',
        'building-chat-app',
        'content-management-system',
      ],
    },
    {
      type: 'category',
      label: '🧰 Dev Tools',
      items: [
        'virtual-environments-venv-and-uv',
      ],
    },
    {
      type: 'category',
      label: '✅ Quality & Security',
      items: [
        'testing-strategy',
        'security-hardening',
        'caching-and-performance',
        'logging-and-observability',
      ],
    },
    {
      type: 'category',
      label: '🚢 Operations',
      items: [
        'deployment-and-operations',
        'ci-cd-for-django',
        'troubleshooting-guide',
      ],
    },
  ],
};

export default sidebars;
