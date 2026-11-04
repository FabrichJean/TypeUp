import {
  Droplet,
  Gem,
  HeartPulse,
  Hourglass,
  Magnet,
  Shield,
  ShieldPlus,
  Snowflake,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { RelicId } from '../../quest/relics'

const ICONS: Record<RelicId, LucideIcon> = {
  shield: Shield,
  heart: HeartPulse,
  armor: ShieldPlus,
  hourglass: Hourglass,
  magnet: Magnet,
  gold: Gem,
  nova: Zap,
  vampire: Droplet,
  frost: Snowflake,
}

export function RelicIcon({ id, size = 20 }: { id: RelicId; size?: number }) {
  const Icon = ICONS[id]
  return <Icon className="icon" width={size} height={size} aria-hidden="true" />
}
