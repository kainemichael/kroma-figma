import { showUI } from '@create-figma-plugin/utilities'

export default async function () {
  showUI({ height: 640, width: 520 })

  // Read color styles using async API
  const paintStyles = await figma.getLocalPaintStylesAsync()
  const colorStyles = paintStyles
    .filter(style => style.paints.length > 0 && style.paints[0].type === 'SOLID')
    .map(style => {
      const paint = style.paints[0] as SolidPaint
      const { r, g, b } = paint.color
      const a = paint.opacity ?? 1
      return {
        id: style.id,
        name: style.name,
        value: rgbToHex(r, g, b, a)
      }
    })

  // Read variables using async API
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const colorVars = await figma.variables.getLocalVariablesAsync('COLOR')

  const variableCollections = collections.map(collection => ({
    id: collection.id,
    name: collection.name,
    modes: collection.modes,
    variables: colorVars
      .filter(v => v.variableCollectionId === collection.id)
      .map(v => ({
        name: v.name,
        values: collection.modes.map(mode => {
          const raw = v.valuesByMode[mode.modeId]
          return {
            modeId: mode.modeId,
            modeName: mode.name,
            value: isRGBA(raw) ? rgbToHex(raw.r, raw.g, raw.b, raw.a ?? 1) : null
          }
        })
      }))
  }))

  // Send data to UI
  figma.ui.postMessage({ type: 'LOAD_DATA', colorStyles, variableCollections })
}

function rgbToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  return a < 1 ? hex + toHex(a) : hex
}

function isRGBA(value: unknown): value is RGBA {
  return typeof value === 'object' && value !== null && 'r' in value
}