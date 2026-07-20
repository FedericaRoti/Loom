export const projectileSession = {
  title: 'Projectile motion, spoken through',
  artifactType: 'projectile-simulator',
  badges: [
    {
      label: 'Voice-first',
      value: 'Speak, then glance at transcript',
    },
    {
      label: 'Money shot',
      value: 'Loom generates the artifact',
    },
    {
      label: 'Payoff',
      value: 'Manipulate the simulator live',
      icon: 'target',
    },
  ],
  steps: [
    {
      id: 'listening',
      stage: 'Listening',
      voiceState: 'Loom is listening',
      status: 'Listening',
      transcript: {
        speaker: 'Learner',
        mode: 'spoken',
        text: 'Can you help me understand why a thrown ball makes an arc? I know angle and speed matter, but I do not see why.',
      },
      title: 'A learner asks by voice',
      detail: 'Loom starts by locating what the learner is trying to see.',
    },
    {
      id: 'orienting',
      stage: 'Understanding',
      voiceState: 'Loom is speaking',
      status: 'Following the question',
      transcript: {
        speaker: 'Loom',
        mode: 'voice',
        text: 'Before we draw anything, let us stay with the launch. The angle and the initial speed are the two choices that shape what follows.',
      },
      boardActions: [
        { type: 'add_concept', id: 'launch-angle', label: 'launch angle', tone: 'terracotta' },
        { type: 'add_concept', id: 'initial-speed', label: 'initial speed', tone: 'amber' },
      ],
      checks: [
        { id: 'projectile-launch', question: 'Which two launch choices shape what follows?' },
      ],
      title: 'Loom establishes the first relationship',
      detail: 'The board keeps only the variables already named in the conversation.',
    },
    {
      id: 'clarifying',
      stage: 'Clarifying',
      voiceState: 'Loom is listening',
      status: 'Clarifying a term',
      transcript: {
        speaker: 'Learner',
        mode: 'spoken',
        text: 'When you say the launch shapes it, do you mean the ball is doing two different motions at once?',
      },
      title: 'The learner checks the thread',
      detail: 'The visual memory waits for a meaningful distinction, rather than jumping to a chart.',
    },
    {
      id: 'building-model',
      stage: 'Building a model',
      voiceState: 'Loom is speaking',
      status: 'Building the model',
      transcript: {
        speaker: 'Loom',
        mode: 'voice',
        text: 'Exactly. One motion carries the ball sideways while the other lifts it and pulls it down. Together, they make the trajectory.',
      },
      boardActions: [
        { type: 'add_concept', id: 'sideways-motion', label: 'sideways motion', tone: 'sage' },
        { type: 'add_concept', id: 'vertical-motion', label: 'vertical motion', tone: 'sage' },
        { type: 'add_concept', id: 'trajectory', label: 'trajectory', tone: 'ink' },
        { type: 'connect', from: 'sideways-motion', to: 'trajectory', label: 'carries across' },
      ],
      checks: [
        { id: 'projectile-motion', question: 'Which motion keeps the ball moving sideways?' },
      ],
      resolvedCheckIds: ['projectile-launch'],
      title: 'Loom connects the two motions',
      detail: 'Each banner now answers a specific part of the learner’s question.',
    },
    {
      id: 'need-to-see',
      stage: 'Testing the idea',
      voiceState: 'Loom is listening',
      status: 'Finding the next need',
      transcript: {
        speaker: 'Learner',
        mode: 'spoken',
        text: 'I can name the pieces now, but I still cannot predict what changes when I move the angle or speed.',
      },
      boardActions: [
        { type: 'connect', from: 'vertical-motion', to: 'trajectory', label: 'lifts and falls' },
        { type: 'focus', target: 'trajectory' },
        { type: 'add_formula', id: 'horizontal-velocity', label: 'horizontal motion', notation: 'vₓ = v₀ cos θ' },
      ],
      checks: [
        { id: 'projectile-change', question: 'What can you test by changing the launch angle?' },
      ],
      resolvedCheckIds: ['projectile-motion'],
      title: 'The conversation reaches a visual need',
      detail: 'The question is no longer only definitional: it asks what changes when the variables move.',
    },
    {
      id: 'choosing',
      stage: 'Choosing form',
      voiceState: 'Loom is speaking',
      status: 'Choosing the right form',
      transcript: {
        speaker: 'Loom',
        mode: 'voice',
        text: 'That is the point where a simulator helps. I am choosing controls you can move, so the arc answers the question with you.',
      },
      title: 'Loom chooses a simulator',
      detail: 'The form follows the learner’s need to test changing variables.',
    },
    {
      id: 'generating',
      stage: 'Generating',
      voiceState: 'Loom is generating',
      status: 'Generating simulator',
      transcript: {
        speaker: 'Loom',
        mode: 'voice',
        text: 'I am generating a controlled simulator with launch angle and initial velocity.',
      },
      title: 'Loom builds the artifact',
      detail: 'The generation moment is visible before the simulator appears.',
      delay: 1300,
    },
    {
      id: 'ready',
      stage: 'Simulator ready',
      voiceState: 'Loom is speaking',
      status: 'Simulator ready',
      transcript: {
        speaker: 'Loom',
        mode: 'voice',
        text: 'Now move the angle or velocity. Watch how the arc changes before we put it into words.',
      },
      title: 'The learner can manipulate the idea',
      detail: 'The learner can now test the concept instead of only hearing it explained.',
    },
  ],
  generationSteps: [
    {
      id: 'understanding',
      label: 'Understanding concept',
      detail: 'projectile motion',
    },
    {
      id: 'choosing',
      label: 'Choosing form',
      detail: 'interactive visual artifact',
    },
    {
      id: 'generating',
      label: 'Generating simulator',
      detail: 'angle and velocity controls',
    },
  ],
}
