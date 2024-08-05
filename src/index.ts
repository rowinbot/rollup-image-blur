import { extname } from 'path'
import type { Plugin } from 'rollup'
import { createFilter, FilterPattern } from '@rollup/pluginutils'
import svgToMiniDataURI from 'mini-svg-data-uri'
import { getBlurDataUriFromImagePath } from './blur'

interface ITemplateData {
  dataUri: string
  blurDataUri: string
}

interface IImageData {
  format: string
  isSvg: boolean
  mime: string
  filePath: string
}

export interface ImagePluginOptions {
  exclude?: FilterPattern
  include?: FilterPattern
}

const defaults = {
  exclude: null,
  include: null,
}

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const template = ({ dataUri, blurDataUri }: ITemplateData) => `
  const img = "${dataUri}";
  export const blurImg = "${blurDataUri}";

  export default img;
`

async function getTemplateData({
  format,
  isSvg,
  mime,
  filePath,
}: IImageData): Promise<ITemplateData> {
  const dataUri = isSvg
    ? svgToMiniDataURI(filePath)
    : `data:${mime};${format},${filePath}`

  const blurDataUri = isSvg
    ? dataUri
    : await getBlurDataUriFromImagePath(filePath)

  return { dataUri, blurDataUri }
}

export default function image(opts: ImagePluginOptions = {}): Plugin {
  const options = Object.assign({}, defaults, opts)
  const filter = createFilter(options.include, options.exclude)

  return {
    name: 'image',

    async load(id: string) {
      if (!filter(id)) {
        return null
      }

      const mime = mimeTypes[extname(id)]
      if (!mime) {
        // not an image
        return null
      }

      this.addWatchFile(id)
      const isSvg = mime === mimeTypes['.svg']
      const format = isSvg ? 'utf-8' : 'base64'
      const templateData = await getTemplateData({
        format,
        isSvg,
        mime,
        filePath: id,
      })
      const code = template(templateData)

      return code.trim()
    },
  }
}
