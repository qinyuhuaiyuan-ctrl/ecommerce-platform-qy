// 商品图片地址解析：把后端商品数据里的源码树路径映射为构建后可访问的资源地址。
// 只使用 Vite 内建的 import.meta.glob，不引入依赖、不发网络请求、不读取主题状态。
const assetModules = import.meta.glob('../assets/images/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
})

const ASSET_DIRECTORY = 'assets/images/'

const assetUrlByFileName = Object.create(null)

for (const [modulePath, assetUrl] of Object.entries(assetModules)) {
  const directoryIndex = modulePath.lastIndexOf(ASSET_DIRECTORY)
  if (directoryIndex === -1) continue
  assetUrlByFileName[modulePath.slice(directoryIndex + ASSET_DIRECTORY.length)] = assetUrl
}

const SOURCE_TREE_PATTERN = /^\/?src\/assets\/images\/(.+)$/

const missing = reason => ({ kind: 'missing', reason })

export const resolveProductImage = raw => {
  if (typeof raw !== 'string') return missing('no-data')

  const value = raw.trim()
  if (!value) return missing('no-data')

  const sourceTreeMatch = SOURCE_TREE_PATTERN.exec(value)
  if (sourceTreeMatch) {
    const assetUrl = assetUrlByFileName[sourceTreeMatch[1]]
    return assetUrl ? { kind: 'ready', src: assetUrl } : missing('unknown')
  }

  return { kind: 'ready', src: value }
}

export default resolveProductImage
