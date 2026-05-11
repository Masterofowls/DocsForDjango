import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

const features = [
  {
    icon: '🚀',
    title: 'From Zero to Production',
    description:
      'Complete coverage from installing Python and Django through deploying to production servers with Nginx, Gunicorn, and SSL.',
  },
  {
    icon: '🗄️',
    title: 'ORM Mastery',
    description:
      'Deep dives into models, QuerySets, transactions, multi-database routing, and complex relations including ManyToMany and GenericForeignKey.',
  },
  {
    icon: '🔌',
    title: 'REST APIs',
    description:
      'Django REST Framework from basics to advanced patterns — serializers, viewsets, routers, permissions, throttling, and JWT authentication.',
  },
  {
    icon: '⚡',
    title: 'Async & Realtime',
    description:
      'Celery background tasks, Django Channels WebSockets, async views, and Redis integration for real-time applications.',
  },
  {
    icon: '🔐',
    title: 'Auth & Security',
    description:
      'Built-in auth, custom permissions, django-allauth social login, OAuth2, CSRF/XSS hardening, and OWASP best practices.',
  },
  {
    icon: '🛒',
    title: 'Practical Tutorials',
    description:
      'Step-by-step guides for building a blog, e-commerce store with orders, real-time chat app, and a full CMS.',
  },
  {
    icon: '✅',
    title: 'Testing & CI/CD',
    description:
      'pytest-django, TestCase patterns, fixtures, mocking, factory patterns, GitHub Actions pipelines, and test coverage.',
  },
  {
    icon: '🎨',
    title: 'Styling & Frontend',
    description:
      'Tailwind CSS integration, Bootstrap 5, template inheritance, static file management, and PostCSS build pipelines.',
  },
  {
    icon: '📁',
    title: 'Media & Imports',
    description:
      'File uploads with validation, S3-compatible storage, CSV/Excel data imports with bulk operations and error handling.',
  },
];

function HeroBanner(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <div className='hero-banner'>
      <h1>🐍 {siteConfig.title}</h1>
      <p>{siteConfig.tagline}</p>
      <div className='hero-buttons'>
        <Link className='btn-primary-hero' to='/docs/intro'>
          📖 Start Reading
        </Link>
        <Link className='btn-outline-hero' to='/docs/installation-and-tooling'>
          ⚡ Quick Install
        </Link>
      </div>
    </div>
  );
}

function StatItem({number, label}: {number: string; label: string}): ReactNode {
  return (
    <div className='stat-item'>
      <span className='stat-number'>{number}</span>
      <span className='stat-label'>{label}</span>
    </div>
  );
}

function FeatureCard({icon, title, description}: {icon: string; title: string; description: string}): ReactNode {
  return (
    <div className='feature-card'>
      <span className='feature-icon'>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <HeroBanner />

        <div className='stats-bar'>
          <div className='stats-inner'>
            <StatItem number='36' label='Topic Guides' />
            <StatItem number='8' label='Categories' />
            <StatItem number='1000+' label='Code Examples' />
            <StatItem number='Django 5' label='Supported' />
          </div>
        </div>

        <section className='features-section'>
          <div style={{textAlign: 'center', marginBottom: '48px'}}>
            <h2 style={{fontSize: '1.8rem', fontWeight: 800}}>Everything you need to master Django</h2>
            <p style={{opacity: 0.7, maxWidth: 560, margin: '8px auto 0'}}>
              Structured reference docs with definitions, syntax, and runnable examples for every Django concept.
            </p>
          </div>
          <div className='features-grid'>
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
