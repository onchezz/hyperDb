import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import clsx from 'clsx'
import React from 'react'

import styles from './index.module.css'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/HyperDB/Overview">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  return (
    <Layout description="HyperDB is a local-first reactive data layer built on top of WatermelonDB.">
      <HomepageHeader />
      <main className="container margin-vert--lg">
        <p>
          HyperDB extends WatermelonDB with a Supabase-style local query client, React-first reactive hooks, and
          secure peer sync transport primitives for LAN/WebRTC/Bluetooth channel implementations.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg margin-right--sm" to="/HyperDB/Overview">
            Read HyperDB Overview
          </Link>
          <Link className="button button--secondary button--lg" to="/EnhancedInstall">
            Install & Publish
          </Link>
        </div>
      </main>
    </Layout>
  )
}
