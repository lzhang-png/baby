import { useBackgroundEffect } from "@/lib/background-setting"

/** Theme-aware gradient blobs that slowly drift behind all content. */
function AuroraBackground() {
  return (
    <div className="app-bg aurora-bg" aria-hidden>
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
    </div>
  )
}

/** Soft bath-time bubbles drifting up from the bottom. */
function BubblesBackground() {
  return (
    <div className="app-bg bubbles-bg" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} className={`bubble bubble-${i + 1}`} />
      ))}
    </div>
  )
}

/** Dreamy nursery night sky: layers of twinkling stars. */
function StarsBackground() {
  return (
    <div className="app-bg stars-bg" aria-hidden>
      <div className="stars-layer stars-layer-1" />
      <div className="stars-layer stars-layer-2" />
      <div className="stars-layer stars-layer-3" />
    </div>
  )
}

/** Renders the user's selected decorative background, or nothing when off. */
export function AppBackground() {
  const effect = useBackgroundEffect()

  if (effect === "bubbles") return <BubblesBackground />
  if (effect === "stars") return <StarsBackground />
  if (effect === "aurora") return <AuroraBackground />
  return null
}
