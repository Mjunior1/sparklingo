import './QuickWinsSection.css'
import {
  ArrowRight,
  Brain,
  Clock3,
  Flame,
  MessageCircleMore,
  Mic,
  Sparkles,
  Star,
  Volume2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  type QuickWinHeaderIcon,
  type QuickWinIconType,
  type QuickWinItem,
  type QuickWinsConfig,
} from '../../services/quickWins'

const cardIconMap: Record<QuickWinIconType, LucideIcon> = {
  message: MessageCircleMore,
  speaker: Volume2,
  star: Star,
  mic: Mic,
  brain: Brain,
  bolt: Zap,
}

const headerIconMap: Record<QuickWinHeaderIcon, LucideIcon> = {
  zap: Zap,
  sparkles: Sparkles,
  flame: Flame,
}

const formatTimer = (seconds: number) => {
  const safeValue = Math.max(0, seconds)
  const minutes = Math.floor(safeValue / 60)
  const remainder = safeValue % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const getProgressPercent = (item: QuickWinItem) => {
  if (item.progressMode === 'timer') {
    if (item.progressTotal > 0 && item.progressCurrent > 0) {
      return Math.min(100, Math.max(0, (item.progressCurrent / item.progressTotal) * 100))
    }

    return 72
  }

  return Math.min(100, Math.max(0, (item.progressCurrent / Math.max(1, item.progressTotal)) * 100))
}

const getProgressLabel = (item: QuickWinItem) => {
  if (item.progressMode === 'timer') return formatTimer(item.timerSeconds)
  return `${item.progressCurrent}/${item.progressTotal}`
}

type QuickWinCardProps = {
  item: QuickWinItem
  index?: number
}

export function QuickWinCard({ item, index = 0 }: QuickWinCardProps) {
  const Icon = cardIconMap[item.iconType]
  const progressPercent = getProgressPercent(item)
  const progressLabel = getProgressLabel(item)
  const style = {
    '--qw-card-accent': item.accentColor,
    '--qw-card-glow': item.iconGlowColor,
    '--qw-card-overlay': item.overlayColor,
    '--qw-card-delay': `${index * 120}ms`,
  } as CSSProperties

  return (
    <article className="spark-qw-card" style={style} tabIndex={0}>
      <div className="spark-qw-card-bloom" aria-hidden="true" />
      <div className="spark-qw-card-sheen" aria-hidden="true" />

      <div className="spark-qw-card-top">
        <span className="spark-qw-card-icon" aria-hidden="true">
          <span className="spark-qw-card-icon-coreglow" />
          <span className="spark-qw-card-icon-midbloom" />
          <span className="spark-qw-card-icon-diffusion" />
          <span className="spark-qw-card-icon-particles" />
          {item.iconUrl ? <img src={item.iconUrl} alt="" /> : <Icon size={34} strokeWidth={2.2} />}
        </span>
        <span className="spark-qw-card-badge">
          <Star size={14} />
          +{item.XPValue} XP
        </span>
      </div>

      <div className="spark-qw-card-copy">
        <strong>{item.title}</strong>
        <p>{item.subtitle}</p>
      </div>

      <div className="spark-qw-card-meta">
        {item.progressMode === 'timer' ? (
          <small className="spark-qw-card-timer">
            <Clock3 size={13} />
            {progressLabel}
          </small>
        ) : (
          <small>{progressLabel}</small>
        )}
      </div>

      <div className="spark-qw-card-progress" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="spark-qw-card-footer">
        <span className="spark-qw-card-progresslabel">{item.CTAButtonLabel}</span>
        <span className="spark-qw-card-cta-circle" title={item.CTAButtonLabel || item.title} aria-hidden="true">
          <ArrowRight size={16} />
        </span>
      </div>
    </article>
  )
}

type QuickWinsSectionProps = {
  config: QuickWinsConfig
  items: QuickWinItem[]
  cinematicStyle?: string
  preview?: boolean
}

export function QuickWinsSection({
  config,
  items,
  cinematicStyle = 'violet',
  preview = false,
}: QuickWinsSectionProps) {
  const HeaderIcon = headerIconMap[config.headerIconType]

  return (
    <section className={`spark-qw-section spark-qw-section-${cinematicStyle}${preview ? ' is-preview' : ''}`} aria-labelledby="quick-wins-title">
      <div className="spark-qw-ambient" aria-hidden="true" />

      <header className="spark-qw-header">
        <div className="spark-qw-copy">
          <div className="spark-qw-titleline">
            <span className="spark-qw-titleline-icon" aria-hidden="true">
              <HeaderIcon size={24} strokeWidth={2.6} />
            </span>
            <h2 id="quick-wins-title">{config.title}</h2>
          </div>
          <p>{config.subtitle}</p>
        </div>

        <button className="spark-qw-viewall" type="button">
          <span>{config.viewAllLabel}</span>
          <ArrowRight size={16} />
        </button>
      </header>

      <div className="spark-qw-track" role="list" aria-label="Quick Wins">
        {items.map((item, index) => (
          <div role="listitem" key={item.id}>
            <QuickWinCard item={item} index={index} />
          </div>
        ))}
      </div>
    </section>
  )
}
