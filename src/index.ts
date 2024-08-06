// Trick to get global image types working
/// <reference path="../image-types.d.ts" />

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
  relativePath: string
  filePath: string
}

export interface PluginOptions {
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
  export const imageUri = "${dataUri}";
  export const blurDataUri = "${blurDataUri}";
  console.log('loading up image')

  export default imageUri;
`

async function getTemplateData({
  isSvg,
  relativePath,
  filePath,
}: IImageData): Promise<ITemplateData> {
  const dataUri = isSvg ? svgToMiniDataURI(filePath) : relativePath

  const blurDataUri = isSvg
    ? dataUri
    : await getBlurDataUriFromImagePath(filePath)

  return { dataUri, blurDataUri }
}

export default function imageBlur<A>(opts: PluginOptions = {}): Plugin<A> {
  const options = Object.assign({}, defaults, opts)
  const filter = createFilter(options.include, options.exclude)

  return {
    name: 'image-blur',

    async transform(initialCode, id) {
      if (!filter(id)) {
        return null
      }

      const mime = mimeTypes[extname(id)]
      if (!mime) {
        // not an image
        return null
      }
      // TODO: Improve to be less brittle / tightly coupled to Vite
      const imagePath = initialCode.split('"')[1]

      this.addWatchFile(id)
      const isSvg = mime === mimeTypes['.svg']
      const format = isSvg ? 'utf-8' : 'base64'
      const templateData = await getTemplateData({
        format,
        isSvg,
        mime,
        relativePath: imagePath,
        filePath: id,
      })
      const code = template(templateData)
      console.warn(id, code)

      return code.trim()
    },
  }
}
