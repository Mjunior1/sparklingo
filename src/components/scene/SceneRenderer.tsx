import './SceneRenderer.css'
import type { CSSProperties, ReactNode } from 'react'
import type { SceneAssetRecord, SceneAssetSafeArea } from '../../services/sceneAssets'

type SceneRendererMode = 'auto' | 'mobile' | 'desktop'

const focalPointMap: Record<SceneAssetRecord['focalPoint'], string> = {
  center: '50% 50%',
  'center-left': '34% 50%',
  'center-right': '66% 50%',
  top: '50% 20%',
  bottom: '50% 78%',
}

type SafeAreaContainerProps = {
  area: SceneAssetSafeArea
  kind?: 'text' | 'character'
  debug?: boolean
  className?: string
  children?: ReactNode
}

export function SafeAreaContainer({ area, kind = 'text', debug = false, className = '', children }: SafeAreaContainerProps) {
  const style = {
    '--scene-area-left': `${area.x}%`,
    '--scene-area-top': `${area.y}%`,
    '--scene-area-width': `${area.width}%`,
    '--scene-area-height': `${area.height}%`,
  } as CSSProperties

  return (
    <div
      className={`scene-safe-area scene-safe-area-${kind}${debug ? ' is-debug' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </div>
  )
}

type NarrativeOverlayProps = {
  asset: SceneAssetRecord
}

export function NarrativeOverlay({ asset }: NarrativeOverlayProps) {
  const style = {
    '--scene-overlay-opacity': `${asset.overlayIntensity / 100}`,
    '--scene-blur-strength': `${asset.blurIntensity}px`,
    '--scene-brightness': `${asset.brightness / 100}`,
  } as CSSProperties

  return <div className={`scene-overlay scene-overlay-${asset.uiOverlayStyle}`} style={style} />
}

type CinematicImageProps = {
  asset: SceneAssetRecord
  mode?: SceneRendererMode
}

export function CinematicImage({ asset, mode = 'auto' }: CinematicImageProps) {
  const mobileSource = asset.imageUrlMobile || asset.imageUrlDesktop
  const desktopSource = asset.imageUrlDesktop || asset.imageUrlMobile
  const position = focalPointMap[asset.focalPoint]

  const imageStyle = {
    objectPosition: position,
    filter: `brightness(${asset.brightness / 100})`,
  } satisfies CSSProperties

  if (mode === 'mobile') {
    return <img className="scene-image" src={mobileSource} alt={asset.title} style={imageStyle} />
  }

  if (mode === 'desktop') {
    return <img className="scene-image" src={desktopSource} alt={asset.title} style={imageStyle} />
  }

  return (
    <picture className="scene-picture">
      <source media="(max-width: 780px)" srcSet={mobileSource} />
      <img className="scene-image" src={desktopSource} alt={asset.title} style={imageStyle} />
    </picture>
  )
}

type SceneRendererProps = {
  asset: SceneAssetRecord
  mode?: SceneRendererMode
  showGuides?: boolean
  eyebrow?: string
  title?: string
  subtitle?: string
  badge?: string
  cta?: string
  footer?: string
  className?: string
}

export function SceneRenderer({
  asset,
  mode = 'auto',
  showGuides = false,
  eyebrow,
  title,
  subtitle,
  badge,
  cta,
  footer,
  className = '',
}: SceneRendererProps) {
  return (
    <article className={`scene-renderer scene-mode-${mode}${className ? ` ${className}` : ''}`}>
      <CinematicImage asset={asset} mode={mode} />
      <NarrativeOverlay asset={asset} />

      <SafeAreaContainer area={asset.characterSafeArea} kind="character" debug={showGuides}>
        {showGuides && <span className="scene-guide-label">Character safe area</span>}
      </SafeAreaContainer>

      <SafeAreaContainer area={asset.textSafeArea} debug={showGuides}>
        <div className="scene-copy">
          {eyebrow && <span className="scene-eyebrow">{eyebrow}</span>}
          {title && <h3>{title}</h3>}
          {subtitle && <p>{subtitle}</p>}
          {(badge || cta) && (
            <div className="scene-actions">
              {badge && <span className="scene-badge">{badge}</span>}
              {cta && <span className="scene-cta">{cta}</span>}
            </div>
          )}
        </div>
      </SafeAreaContainer>

      {footer && (
        <div className="scene-footer">
          <span>{footer}</span>
        </div>
      )}
    </article>
  )
}
