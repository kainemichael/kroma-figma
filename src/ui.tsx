import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { render } from '@create-figma-plugin/ui'

type ColorStyle = { id: string; name: string; value: string }
type VariableValue = { modeId: string; modeName: string; value: string | null }
type Variable = { name: string; values: VariableValue[] }
type Collection = {
  id: string
  name: string
  modes: { modeId: string; name: string }[]
  variables: Variable[]
}
type ModeMapping = { lightModeId: string; darkModeId: string }

const ORANGE = '#F8632D'
const BG = '#1a1a1a'
const SURFACE = '#242424'
const BORDER = 'rgba(255,255,255,0.08)'

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange() }}
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        border: checked ? `2px solid ${ORANGE}` : '2px solid rgba(255,255,255,0.25)',
        background: checked ? ORANGE : 'transparent',
        flexShrink: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      )}
    </div>
  )
}

function ColorSwatch({ value }: { value: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: value ?? '#ccc',
        border: `1px solid ${BORDER}`,
        flexShrink: 0
      }} />
      <span style={{ fontSize: 10, opacity: 0.55, fontFamily: 'monospace' }}>
        {value ?? 'alias'}
      </span>
    </div>
  )
}

function VariableTable({ collection, mapping, onMappingChange, selected, onToggle }: {
  collection: Collection
  mapping: ModeMapping
  onMappingChange: (m: ModeMapping) => void
  selected: boolean
  onToggle: () => void
}) {
  const modes = collection.modes

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Checkbox checked={selected} onChange={onToggle} />
        <span style={{ fontSize: 12, fontWeight: 700, flex: 1, color: 'rgba(255,255,255,0.9)' }}>{collection.name}</span>
        <span style={{ fontSize: 11, opacity: 0.35 }}>{collection.variables.length} variables</span>
      </div>

      {modes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, marginLeft: 22 }}>
          {[
            { label: 'Light mode', key: 'lightModeId' as const },
            { label: 'Dark mode', key: 'darkModeId' as const }
          ].map(({ label, key }) => (
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px 0', fontSize: 10, opacity: 0.4 }}>{label}</p>
              <select
                value={mapping[key]}
                onChange={(e) => onMappingChange({ ...mapping, [key]: (e.target as HTMLSelectElement).value })}
                style={{
                  width: '100%',
                  fontSize: 11,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: `1px solid ${BORDER}`,
                  background: SURFACE,
                  color: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {modes.map(m => (
                  <option key={m.modeId} value={m.modeId} style={{ background: SURFACE }}>{m.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginLeft: 22, borderRadius: 6, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `1.5fr ${modes.map(() => '1fr').join(' ')}`,
          background: 'rgba(255,255,255,0.03)',
          borderBottom: `1px solid ${BORDER}`,
          padding: '6px 10px'
        }}>
          <span style={{ fontSize: 10, opacity: 0.35, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
          {modes.map(m => (
            <span key={m.modeId} style={{ fontSize: 10, opacity: 0.35, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.name}</span>
          ))}
        </div>

        {collection.variables.map((variable, i) => (
          <div
            key={variable.name}
            style={{
              display: 'grid',
              gridTemplateColumns: `1.5fr ${modes.map(() => '1fr').join(' ')}`,
              padding: '7px 10px',
              borderBottom: i < collection.variables.length - 1 ? `1px solid ${BORDER}` : 'none',
              alignItems: 'center',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
            }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
              {variable.name}
            </span>
            {modes.map(m => {
              const val = variable.values.find(v => v.modeId === m.modeId)
              return <ColorSwatch key={m.modeId} value={val?.value ?? null} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Plugin() {
  const [tab, setTab] = useState<string>('Color Styles')
  const [colorStyles, setColorStyles] = useState<ColorStyle[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set())
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [modeMappings, setModeMappings] = useState<Record<string, ModeMapping>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage
      if (msg?.type === 'LOAD_DATA') {
        setColorStyles(msg.colorStyles)
        setCollections(msg.variableCollections)
        const defaults: Record<string, ModeMapping> = {}
        for (const col of msg.variableCollections as Collection[]) {
          defaults[col.id] = {
            lightModeId: col.modes[0]?.modeId ?? '',
            darkModeId: col.modes[1]?.modeId ?? col.modes[0]?.modeId ?? ''
          }
        }
        setModeMappings(defaults)
      }
    }
  }, [])

  function toggleStyle(id: string) {
    setSelectedStyles(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCollection(id: string) {
    setSelectedCollections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleMasterStyles() {
    if (selectedStyles.size === colorStyles.length) {
      setSelectedStyles(new Set())
    } else {
      setSelectedStyles(new Set(colorStyles.map(s => s.id)))
    }
  }

  function toggleMasterCollections() {
    if (selectedCollections.size === collections.length) {
      setSelectedCollections(new Set())
    } else {
      setSelectedCollections(new Set(collections.map(c => c.id)))
    }
  }

  function handleCopy() {
    const payload = {
      source: 'varsync',
      version: 1,
      colorStyles: colorStyles.filter(s => selectedStyles.has(s.id)),
      variableCollections: collections
        .filter(c => selectedCollections.has(c.id))
        .map(c => ({ ...c, modeMapping: modeMappings[c.id] }))
    }
    const text = JSON.stringify(payload, null, 2)
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalSelected = tab === 'Color Styles' ? selectedStyles.size : selectedCollections.size
  const allStylesSelected = colorStyles.length > 0 && selectedStyles.size === colorStyles.length
  const allCollectionsSelected = collections.length > 0 && selectedCollections.size === collections.length

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: BG,
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'white' }}>Kroma (Figma)</p>
        <p style={{ margin: '2px 0 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Export color styles and variables from Figma to Framer</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}` }}>
          {['Color Styles', 'Variables'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${ORANGE}` : '2px solid transparent',
                color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: tab === t ? 600 : 400,
                padding: '8px 12px',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.15s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {tab === 'Color Styles' && (
          <div>
            {colorStyles.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, opacity: 0.4 }}>No color styles found in this file.</p>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
                  <Checkbox checked={allStylesSelected} onChange={toggleMasterStyles} />
                  <span style={{ fontSize: 11, opacity: 0.4, cursor: 'pointer' }} onClick={toggleMasterStyles}>
                    {allStylesSelected ? 'Deselect all' : 'Select all'} ({colorStyles.length})
                  </span>
                </div>
                {colorStyles.map(style => (
                  <div
                    key={style.id}
                    onClick={() => toggleStyle(style.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}
                  >
                    <Checkbox checked={selectedStyles.has(style.id)} onChange={() => toggleStyle(style.id)} />
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: style.value, border: `1px solid ${BORDER}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1, color: 'rgba(255,255,255,0.85)' }}>{style.name}</span>
                    <span style={{ fontSize: 11, opacity: 0.35, fontFamily: 'monospace' }}>{style.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Variables' && (
          <div>
            {collections.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, opacity: 0.4 }}>No color variables found in this file.</p>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
                  <Checkbox checked={allCollectionsSelected} onChange={toggleMasterCollections} />
                  <span style={{ fontSize: 11, opacity: 0.4, cursor: 'pointer' }} onClick={toggleMasterCollections}>
                    {allCollectionsSelected ? 'Deselect all' : 'Select all'} ({collections.length})
                  </span>
                </div>
                {collections.map(col => (
                  <VariableTable
                    key={col.id}
                    collection={col}
                    mapping={modeMappings[col.id] ?? { lightModeId: col.modes[0]?.modeId, darkModeId: col.modes[0]?.modeId }}
                    onMappingChange={(m) => setModeMappings(prev => ({ ...prev, [col.id]: m }))}
                    selected={selectedCollections.has(col.id)}
                    onToggle={() => toggleCollection(col.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ padding: '10px 16px 12px', borderTop: `1px solid ${BORDER}`, background: BG }}>
        <button
          onClick={handleCopy}
          disabled={totalSelected === 0}
          style={{
            width: '100%',
            padding: '9px 0',
            borderRadius: 8,
            border: 'none',
            background: totalSelected === 0 ? 'rgba(255,255,255,0.08)' : ORANGE,
            color: totalSelected === 0 ? 'rgba(255,255,255,0.3)' : 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: totalSelected === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            marginBottom: 10
          }}
        >
          {copied ? 'Copied!' : totalSelected > 0 ? `Copy ${totalSelected} to Clipboard` : 'Copy to Clipboard'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Created by Kaine</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>v1.0.0</span>
        </div>
      </div>
    </div>
  )
}

export default render(Plugin)