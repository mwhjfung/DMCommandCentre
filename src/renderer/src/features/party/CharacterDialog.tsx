import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { usePcStore, newPc, type PcUnit } from '@/lib/store/pcStore'
import { TagSelect } from '@/components/TagSelect'
import { ABILITIES, SKILLS, type AbilityKey } from '@/lib/dnd/character'

type Draft = Omit<PcUnit, 'id'>

const D5E_RACES = [
  'Human', 'Elf', 'High Elf', 'Wood Elf', 'Dark Elf (Drow)', 'Dwarf', 'Hill Dwarf', 'Mountain Dwarf',
  'Halfling', 'Lightfoot Halfling', 'Stout Halfling', 'Dragonborn', 'Gnome', 'Forest Gnome', 'Rock Gnome',
  'Half-Elf', 'Half-Orc', 'Tiefling', 'Aasimar', 'Goliath', 'Tabaxi', 'Kenku', 'Lizardfolk',
  'Yuan-Ti Pureblood', 'Triton', 'Firbolg', 'Bugbear', 'Goblin', 'Hobgoblin', 'Kobold', 'Orc',
  'Tortle', 'Harengon', 'Owlin', 'Fairy', 'Satyr', 'Leonin', 'Minotaur', 'Centaur'
]

const D5E_CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Blood Hunter'
]

const stripId = (pc: PcUnit): Draft => {
  const { id: _id, ...rest } = pc
  return rest
}


export function CharacterDialog({
  mode,
  pc,
  onClose
}: {
  mode: 'add' | 'edit'
  pc?: PcUnit
  onClose: () => void
}): JSX.Element {
  const addPc = usePcStore((s) => s.addPc)
  const updatePc = usePcStore((s) => s.updatePc)
  const removePc = usePcStore((s) => s.removePc)
  const [d, setD] = useState<Draft>(() => (pc ? stripId(pc) : newPc()))

  const set = <K extends keyof Draft>(k: K, v: Draft[K]): void => setD((p) => ({ ...p, [k]: v }))

  // charClass is stored as "Rogue / Barbarian" — we split/join for TagSelect
  const classValues = d.charClass.split('/').map((s) => s.trim()).filter(Boolean)
  const setClasses = (vals: string[]): void => set('charClass', vals.join(' / '))

  const setAbility = (k: AbilityKey, v: number): void =>
    setD((p) => ({ ...p, abilities: { ...p.abilities, [k]: v } }))
  const toggleSave = (k: AbilityKey): void =>
    setD((p) => ({
      ...p,
      saveProf: p.saveProf.includes(k) ? p.saveProf.filter((x) => x !== k) : [...p.saveProf, k]
    }))
  const toggleSkill = (k: string): void =>
    setD((p) => ({
      ...p,
      skillProf: p.skillProf.includes(k) ? p.skillProf.filter((x) => x !== k) : [...p.skillProf, k]
    }))
  const setSlotMax = (level: number, raw: number): void => {
    const max = Math.max(0, Math.min(raw, 9))
    setD((p) => ({
      ...p,
      slots: p.slots.map((s) =>
        s.level === level ? { ...s, max, current: Math.min(s.current, max) } : s
      )
    }))
  }

  const save = (): void => {
    if (!d.name.trim()) return
    const out = { ...d, name: d.name.trim() }
    if (mode === 'add') addPc(out)
    else if (pc) updatePc(pc.id, out)
    onClose()
  }

  const del = (): void => {
    if (pc && window.confirm(`Delete "${pc.name || 'this character'}"? This can't be undone.`)) {
      removePc(pc.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-8"
      onClick={onClose}
    >
      <div className="panel mt-[5vh] w-[580px] max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            {mode === 'add' ? 'New character' : 'Edit character'}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                autoFocus
                value={d.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Character name"
              />
            </div>
            <div>
              <label className="label">Alias</label>
              <input
                className="input"
                value={d.alias ?? ''}
                onChange={(e) => set('alias', e.target.value || undefined)}
                placeholder="Nickname, title…"
              />
            </div>
            <div>
              <label className="label">Player name</label>
              <input
                className="input"
                value={d.playerName ?? ''}
                onChange={(e) => set('playerName', e.target.value || undefined)}
                placeholder="Player's name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Race</label>
              <TagSelect
                value={d.race}
                options={D5E_RACES}
                placeholder="Bugbear, Elf…"
                onChange={(v) => set('race', Array.isArray(v) ? (v[0] ?? '') : (v as string))}
              />
            </div>
            <div>
              <label className="label">Class(es)</label>
              <TagSelect
                multi
                value={classValues}
                options={D5E_CLASSES}
                placeholder="Rogue, Barbarian…"
                onChange={(v) => setClasses(v as string[])}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['Level', 'level'],
                ['AC', 'ac'],
                ['Speed', 'speed'],
                ['Max HP', 'maxHp'],
                ['Current HP', 'currentHp'],
                ['Temp HP', 'tempHp']
              ] as Array<[string, 'level' | 'ac' | 'speed' | 'maxHp' | 'currentHp' | 'tempHp']>
            ).map(([label, key]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input px-2 text-center"
                  type="number"
                  value={d[key]}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="label">Ability scores &amp; saves</label>
            <div className="grid grid-cols-6 gap-2">
              {ABILITIES.map((a) => (
                <div key={a.key} className="text-center">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted">{a.label}</div>
                  <input
                    className="input px-1 text-center"
                    type="number"
                    value={d.abilities[a.key]}
                    onChange={(e) => setAbility(a.key, Number(e.target.value))}
                  />
                  <label className="mt-1 flex cursor-pointer items-center justify-center gap-1 text-[10px] text-ink-muted">
                    <input
                      type="checkbox"
                      checked={d.saveProf.includes(a.key)}
                      onChange={() => toggleSave(a.key)}
                    />
                    save
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Skill proficiencies</label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {SKILLS.map((sk) => (
                <label key={sk.key} className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={d.skillProf.includes(sk.key)}
                    onChange={() => toggleSkill(sk.key)}
                  />
                  {sk.label}
                  <span className="text-[10px] uppercase text-ink-muted">{sk.ability}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Spell slots — max per level</label>
            <div className="grid grid-cols-3 gap-2">
              {d.slots.map((s) => (
                <label key={s.level} className="flex items-center gap-2 text-sm">
                  <span className="w-7 text-xs text-ink-muted">L{s.level}</span>
                  <input
                    className="input w-14 px-1 text-center"
                    type="number"
                    min={0}
                    max={9}
                    value={s.max}
                    onChange={(e) => setSlotMax(s.level, Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            Senses, proficiencies, defences, conditions, actions and the other tabs are edited on the
            sheet itself.
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          {mode === 'edit' && (
            <button type="button" className="btn-ghost text-danger hover:bg-danger/10" onClick={del}>
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-accent" disabled={!d.name.trim()} onClick={save}>
            {mode === 'add' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
