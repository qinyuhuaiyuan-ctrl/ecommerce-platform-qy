import { expect, it } from 'vitest'
import { resolveProductImage } from '../../src/utils/imageSource.js'

const assetModules = import.meta.glob('../../src/assets/images/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
})

const assetUrl = fileName => assetModules[`../../src/assets/images/${fileName}`]

const seededFiles = [
  'iphone15.png',
  'macbook.png',
  'tshirt.png',
  'jeans.png',
  'python-book.png',
  'algorithm-book.png',
  'nuts.png',
  'tea.png',
  'lamp.png',
  'pillow.png'
]

it('resolves every seeded image_url to the bundled asset url', () => {
  for (const file of seededFiles) {
    const result = resolveProductImage(`/src/assets/images/${file}`)
    expect(result.kind, `kind of ${file}`).toBe('ready')
    expect(result.src, `src of ${file}`).toBe(assetUrl(file))
  }
})

it('keeps the seed data values mapped one to one', () => {
  const resolved = seededFiles.map(file => resolveProductImage(`/src/assets/images/${file}`).src)
  expect(new Set(resolved).size).toBe(seededFiles.length)
})

it('treats empty values as missing image data', () => {
  for (const raw of [undefined, null, '', '   ', '\t\n']) {
    expect(resolveProductImage(raw), `value ${JSON.stringify(raw)}`).toEqual({
      kind: 'missing',
      reason: 'no-data'
    })
  }
})

it('treats an unknown source tree path as an unresolvable image', () => {
  expect(resolveProductImage('/src/assets/images/not-exists.png')).toEqual({
    kind: 'missing',
    reason: 'unknown'
  })
  expect(resolveProductImage('src/assets/images/not-exists.png')).toEqual({
    kind: 'missing',
    reason: 'unknown'
  })
})

it('passes through urls that are already usable', () => {
  expect(resolveProductImage('https://cdn.example.com/images/a.png')).toEqual({
    kind: 'ready',
    src: 'https://cdn.example.com/images/a.png'
  })
  expect(resolveProductImage('/images/a.png')).toEqual({
    kind: 'ready',
    src: '/images/a.png'
  })
  expect(resolveProductImage('data:image/png;base64,AAAA')).toEqual({
    kind: 'ready',
    src: 'data:image/png;base64,AAAA'
  })
})

it('never throws and always answers with a missing result for unusable values', () => {
  for (const raw of [0, 42, {}, [], true, () => 'x']) {
    const result = resolveProductImage(raw)
    expect(result.kind).toBe('missing')
    expect(result.reason).toBe('no-data')
  }
})
