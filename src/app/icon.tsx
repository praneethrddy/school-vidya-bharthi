import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background:
            'linear-gradient(135deg, rgba(245,158,11,1) 0%, rgba(249,115,22,1) 50%, rgba(14,165,233,1) 100%)',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: '#0f172a',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          VB
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
