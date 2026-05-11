import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  reactSidebar: [
    {
      type: 'doc',
      id: 'react-intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Core Fundamentals',
      collapsed: false,
      items: [
        'architecture-and-project-structure',
        'components-props-and-composition',
      ],
    },
    {
      type: 'category',
      label: 'State and Effects',
      collapsed: false,
      items: [
        'state-management-with-hooks',
        'reducers-context-and-scaling-state',
        'effect-system-and-side-effects',
        'custom-hooks-and-reusability',
      ],
    },
    {
      type: 'category',
      label: 'Data, Routing, and UI',
      items: [
        'data-fetching-patterns-and-caching',
        'routing-with-react-router',
        'forms-validation-and-user-input',
        'refs-portals-and-dom-integration',
      ],
    },
    {
      type: 'category',
      label: 'Performance and Scale',
      items: [
        'rendering-performance-and-memoization',
        'code-splitting-and-lazy-loading',
        'concurrent-react-and-transitions',
        'build-tooling-and-bundlers',
      ],
    },
    {
      type: 'category',
      label: 'Quality and Operations',
      items: [
        'testing-react-applications',
        'accessibility-and-internationalization',
        'security-hardening-for-react-apps',
        'build-tooling-and-bundlers',
        'ci-cd-and-deployment-for-react',
        'debugging-and-troubleshooting-react',
      ],
    },
  ],
};

export default sidebars;
