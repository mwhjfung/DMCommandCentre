import { usePcStore, type PcUnit, type PcBackground } from '@/lib/store/pcStore'
import { ALIGNMENTS, CREATURE_SIZES } from '@/lib/dnd/character'

const CHARACTERISTICS: Array<{ key: keyof PcBackground; label: string }> = [
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'hair', label: 'Hair' },
  { key: 'skin', label: 'Skin' },
  { key: 'faith', label: 'Faith' }
]

const CARDS: Array<{ key: keyof PcBackground; label: string }> = [
  { key: 'appearance', label: 'Appearance' },
  { key: 'personality', label: 'Personality traits' },
  { key: 'ideals', label: 'Ideals' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'flaws', label: 'Flaws' }
]

export function BackgroundTab({ pc }: { pc: PcUnit }): JSX.Element {
  const updatePc = usePcStore((s) => s.updatePc)
  const bg = pc.background
  const set = (key: keyof PcBackground, value: string): void =>
    updatePc(pc.id, { background: { ...bg, [key]: value } })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Background</label>
          <input
            className="input"
            placeholder="e.g. Acolyte, City Watch"
            value={bg.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Alignment</label>
          <select className="input" value={bg.alignment} onChange={(e) => set('alignment', e.target.value)}>
            <option value="">—</option>
            {ALIGNMENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Size</label>
          <select className="input" value={bg.size} onChange={(e) => set('size', e.target.value)}>
            <option value="">—</option>
            {CREATURE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {CHARACTERISTICS.map(({ key, label }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input className="input" value={bg[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
      </div>

      {CARDS.map(({ key, label }) => (
        <div key={key} className="panel space-y-1.5 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
          <textarea
            className="input min-h-[72px]"
            value={bg[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}
