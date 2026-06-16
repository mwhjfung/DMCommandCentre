export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export const ABILITIES: Array<{ key: AbilityKey; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' }
]

export interface Skill {
  key: string
  label: string
  ability: AbilityKey
}

export const SKILLS: Skill[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'survival', label: 'Survival', ability: 'wis' }
]

export type Abilities = Record<AbilityKey, number>

export const defaultAbilities = (): Abilities => ({
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10
})

export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
  'Exhaustion'
] as const

export const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
  'Unaligned'
] as const

export const CREATURE_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2)

export const proficiencyBonus = (level: number): number => 2 + Math.floor((Math.max(1, level) - 1) / 4)

export const fmtMod = (n: number): string => `${n >= 0 ? '+' : ''}${n}`

/** Saving throw modifier for an ability, adding proficiency when proficient. */
export function saveMod(abilities: Abilities, key: AbilityKey, proficient: boolean, level: number): number {
  return abilityMod(abilities[key]) + (proficient ? proficiencyBonus(level) : 0)
}

/** Skill check modifier, adding proficiency when proficient. */
export function skillMod(abilities: Abilities, skill: Skill, proficient: boolean, level: number): number {
  return abilityMod(abilities[skill.ability]) + (proficient ? proficiencyBonus(level) : 0)
}

/** Passive Perception = 10 + Perception modifier. */
export function passivePerception(abilities: Abilities, perceptionProficient: boolean, level: number): number {
  const perception = SKILLS.find((s) => s.key === 'perception') as Skill
  return 10 + skillMod(abilities, perception, perceptionProficient, level)
}
