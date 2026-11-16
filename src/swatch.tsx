import {Card} from '@sanity/ui'

import {checkerboard} from './color'

export function ColorSwatch({color, size = 16}: {color?: string | null; size?: number | string}) {
  return (
    <Card
      as="span"
      radius={2}
      shadow={1}
      style={{
        display: 'block',
        width: size,
        height: size,
        flex: 'none',
        background: color ? checkerboard(color) : 'transparent',
      }}
    />
  )
}
