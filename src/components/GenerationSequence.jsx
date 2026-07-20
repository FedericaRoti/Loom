import { Sparkles } from 'lucide-react'

function GenerationSequence({ artifactPlanState, currentStep, generationSteps }) {
  const concepts = generationSteps.map((step) => step.detail)
  const isGenerating = currentStep.id === 'generating'

  return (
    <section className="loom-generation-sequence">
      <p className="loom-reasoning-thread">
        {concepts.map((concept, index) => <span key={concept}>{index > 0 && <b>→</b>}{concept}</span>)}
      </p>
      {isGenerating && (
        <div className="loom-generation-heading">
          <Sparkles size={15} />
          <p>{artifactPlanState.error ? 'Using the stable artifact fallback.' : currentStep.detail}</p>
        </div>
      )}
      {isGenerating && artifactPlanState.isPlanning && <span className="sr-only">Loom is selecting a controlled artifact configuration.</span>}
      {isGenerating && artifactPlanState.plan && <span className="sr-only">Artifact configuration selected.</span>}
    </section>
  )
}

export default GenerationSequence
