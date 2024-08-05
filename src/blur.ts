import sharp from 'sharp'

const DEFAULT_BLUR_SIZE = 10

export async function getBlurDataUriFromImagePath(
  filePath: string,
  blurSize: number = DEFAULT_BLUR_SIZE
): Promise<string> {
  const pipeline = sharp(filePath).resize(blurSize, blurSize, {
    fit: 'inside',
  })

  const buffer = await pipeline
    .clone()
    .normalise()
    .modulate({ saturation: 1.2, brightness: 1 })
    .removeAlpha()
    .toBuffer({ resolveWithObject: true })

  const dataUrl = `data:image/${
    buffer.info.format
  };base64,${buffer.data.toString('base64')}`

  return dataUrl
}
