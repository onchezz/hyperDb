import clsx from 'clsx'
import React from 'react'
import styles from './styles.module.css'

const FeatureList = [
  {
    title: 'Fast Local Runtime',
    description: (
      <>
        HyperTillDB keeps storage local-first so reads and writes stay fast even with large datasets.
      </>
    ),
  },
  {
    title: 'Type-First API',
    description: (
      <>
        Build your model registry with `dbModel`, `defineModels`, and `createDB` using one package API.
      </>
    ),
  },
  {
    title: 'Web + Native',
    description: (
      <>
        Use SQLite adapters on native and LokiJS on web with consistent query and hook behavior.
      </>
    ),
  },
]

function Feature({
  // Svg,
  title,
  description,
}) {
  return (
    <div className={clsx('col col--4')}>
      {/* <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div> */}
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props) => (
            <Feature key={props.title} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
