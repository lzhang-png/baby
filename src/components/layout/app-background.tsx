import { useBackgroundEffect } from "@/lib/background-setting"

/** Dreamy nursery night sky: layers of twinkling stars. */
function StarsBackground() {
  return (
    <div className="app-bg stars-bg" aria-hidden>
      <div className="stars-layer stars-layer-1" />
      <div className="stars-layer stars-layer-2" />
      <div className="stars-layer stars-layer-3" />
      <div className="stars-spaceship" />
    </div>
  )
}

/** Renders the user's selected decorative background, or nothing when off. */
export function AppBackground() {
  const effect = useBackgroundEffect()

  if (effect === "stars") return <StarsBackground />
  return null
}
