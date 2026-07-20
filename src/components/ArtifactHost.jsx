import ConnectionMap from './ConnectionMap.jsx'
import ProjectileSimulator from './ProjectileSimulator.jsx'

function ArtifactHost({ artifactReady, artifactType, connectionMap, projectile }) {
  if (artifactType === 'projectile-simulator') {
    return <ProjectileSimulator artifactReady={artifactReady} {...projectile} />
  }

  if (artifactType === 'connection-map') {
    return <ConnectionMap artifactReady={artifactReady} map={connectionMap} />
  }

  return (
    <section className="rounded-lg border border-[#171717]/10 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">Unsupported artifact</p>
      <p className="mt-2 text-sm text-[#605b52]">This mock can only render controlled artifact types.</p>
    </section>
  )
}

export default ArtifactHost
