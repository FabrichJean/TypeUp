import {
  Brain,
  CalendarDays,
  CodeXml,
  Feather,
  Globe,
  Keyboard,
  Laugh,
  ScrollText,
  Tornado,
  type LucideIcon,
} from 'lucide-react'
import type { PackId } from '../content/packs'

const ICONS: Record<PackId, LucideIcon> = {
  words: Keyboard,
  wiki: Globe,
  onthisday: CalendarDays,
  jokes: Laugh,
  poems: Feather,
  twisters: Tornado,
  facts: Brain,
  proverbs: ScrollText,
  code: CodeXml,
}

/** Icône décorative d'un pack (le nom du pack est toujours écrit à côté). */
export function PackIcon({ id }: { id: string }) {
  const Icon = ICONS[id as PackId]
  return Icon ? <Icon className="icon" aria-hidden="true" /> : null
}
