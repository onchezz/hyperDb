// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'README',
    {
      type: 'category',
      label: 'HyperTillDB',
      items: [
        'HyperTillDB/Overview',
        'HyperTillDB/Architecture',
        'HyperTillDB/ModelFirstSchema',
        'HyperTillDB/DependentModels',
        'HyperTillDB/LocalFirstApi',
        'HyperTillDB/ApiReference',
        'HyperTillDB/ReactIntegration',
        'HyperTillDB/Examples',
        'HyperTillDB/ExpoSetup',
        'HyperTillDB/BackendAdapters',
        'HyperTillDB/SyncEngine',
        'HyperTillDB/SearchPerformance',
        'HyperTillDB/PeerSyncSecurity',
        'HyperTillDB/MigrationGuide',
        'HyperTillDB/TestingStrategy',
        'HyperTillDB/Publishing',
        'HyperTillDB/Troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      collapsed: true,
      items: [
        'Implementation/FileStructure',
        'Implementation/CodeConsistency',
        'Implementation/ChangeTracking',
        'CONTRIBUTING',
        'CHANGELOG',
      ],
    },
  ],
}

module.exports = sidebars
