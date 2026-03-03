import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import clsx from 'clsx'
import React from 'react'

import styles from './index.module.css'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  const logoUrl = useBaseUrl('/img/hypertilldb-logo.svg')
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div>
            <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
            <p className={styles.heroSubtitle}>
              Main package API for local-first apps with reactive queries, model-aware relations, and Expo + Web support.
            </p>
            <div className={styles.buttons}>
              <Link className="button button--primary button--lg" to="/HyperTillDB/Overview">
                Start with Overview
              </Link>
              <Link className="button button--secondary button--lg" to="/HyperTillDB/ApiReference">
                API Reference
              </Link>
            </div>
          </div>
          <img className={styles.heroArt} src={logoUrl} alt="HyperTillDB logo" />
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  return (
    <Layout description="HyperTillDB is a modern local-first database package built on top of Watermelon internals.">
      <HomepageHeader />
      <main className={clsx('container', styles.section)}>
        <h2 className={styles.sectionTitle}>What You Get</h2>
        <div className={styles.cardGrid}>
          <article className={clsx('card', styles.featureCard)}>
            <h3>Type-First Models</h3>
            <p>Use `dbModel` + `defineModels` + `createDB` as the main package API without manual wiring.</p>
          </article>
          <article className={clsx('card', styles.featureCard)}>
            <h3>Reactive by Default</h3>
            <p>Use hooks like `db.useBooks()` and relation helpers with no manual `useEffect` subscriptions.</p>
          </article>
          <article className={clsx('card', styles.featureCard)}>
            <h3>Expo + Web Ready</h3>
            <p>Run native and web with adapter-safe paths and one consistent developer experience.</p>
          </article>
        </div>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/README">
            Install Guide
          </Link>
          <Link className="button button--secondary button--lg" to="/HyperTillDB/ExpoSetup">
            Expo Setup
          </Link>
        </div>
      </main>
    </Layout>
  )
}
