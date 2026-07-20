import { freeWillSession } from './freeWillSession.js'
import { projectileSession } from './projectileSession.js'

export const sessions = [
  {
    id: 'projectile',
    label: 'Projectile motion',
    session: projectileSession,
  },
  {
    id: 'free-will',
    label: 'Free will',
    session: freeWillSession,
  },
]
