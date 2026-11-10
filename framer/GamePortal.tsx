// Framer code component: a doorway from the portfolio into the game.
// A dark card in the site's own style (serif headline, mono tags) with a small pixel-art night street
// playing inside it. Hover and the street lights up and the character picks up the pace. Click to play.
//
// In Framer: Assets > Code > "+" > New Component, paste this file, then drag "GamePortal" onto the page
// and set "Game URL" in the right-hand panel.
import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const W = 192
const H = 96
const PAL: Record<string, string> = { h: "#2a1c22", s: "#b97a56", k: "#1b1626", l: "#d6ecff", o: "#f08a3c", p: "#3a3f5c", w: "#ecebf5" }
const BODY = [
    "...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhsssssshh.", ".hslkssklsh.", ".hssssssssh.", "..ssssssss..",
    "..oooooooo..", ".oooooooooo.", ".soooooooos.", ".soooooooos.", "..oooooooo..", "..pppppppp..",
]
const LEGS = [
    ["..ppp..ppp..", "..ppp..ppp..", "..www..www.."],
    ["..ppp..ppp..", "..www..ppp..", ".......www.."],
    ["..ppp..ppp..", "..ppp..ppp..", "..www..www.."],
    ["..ppp..ppp..", "..ppp..www..", "..www......."],
]

function drawScene(g: CanvasRenderingContext2D, t: number, lit: number, accent: string) {
    // sky and stars
    const sky = g.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, "#0b0a1c")
    sky.addColorStop(1, "#2a2350")
    g.fillStyle = sky
    g.fillRect(0, 0, W, H)
    for (let i = 0; i < 34; i++) {
        const x = (i * 53) % W, y = (i * 29) % 44
        g.fillStyle = `rgba(233,220,255,${0.25 + 0.35 * Math.abs(Math.sin(t * 1.5 + i))})`
        g.fillRect(x, y, 1, 1)
    }
    // far skyline, drifting slowly
    const far = (t * 4) % 48
    for (let i = -1; i < 6; i++) {
        const x = Math.round(i * 48 - far), h = 26 + ((i * 7 + 21) % 5) * 5
        g.fillStyle = "#1c1838"
        g.fillRect(x, 66 - h, 34, h)
        for (let wy = 0; wy < h - 8; wy += 7) for (let wx = 4; wx < 30; wx += 7) {
            const on = (wx * 3 + wy * 5 + i * 11) % 4 !== 0
            g.fillStyle = on ? `rgba(255,217,138,${0.35 + 0.5 * lit})` : "#15122c"
            g.fillRect(x + wx, 70 - h + wy, 3, 4)
        }
    }
    // street
    g.fillStyle = "#3a3458"
    g.fillRect(0, 66, W, 30)
    g.fillStyle = "#4a4470"
    g.fillRect(0, 66, W, 1)
    const near = (t * (18 + lit * 14)) % 24
    g.fillStyle = "#57507e"
    for (let x = -near; x < W; x += 24) g.fillRect(Math.round(x), 84, 10, 1)
    // street lamp with its pool of light
    const lx = Math.round(W - ((t * (18 + lit * 14)) % (W + 60))) + 20
    const glow = g.createRadialGradient(lx, 80, 0, lx, 80, 46)
    glow.addColorStop(0, `rgba(255,196,128,${0.22 + 0.33 * lit})`)
    glow.addColorStop(1, "rgba(255,196,128,0)")
    g.fillStyle = glow
    g.fillRect(lx - 46, 34, 92, 62)
    g.fillStyle = "#15122c"
    g.fillRect(lx, 44, 1, 38)
    g.fillRect(lx - 2, 42, 5, 2)
    g.fillStyle = "#ffe2a8"
    g.fillRect(lx - 1, 44, 3, 2)
    // the hero, walking on the spot, and the spark that follows him
    const frame = Math.floor(t * (6 + lit * 4)) % 4, bob = frame % 2
    const hx = 58, hy = 62 + bob
    g.fillStyle = "rgba(10,8,30,.45)"
    g.fillRect(hx + 1, 79, 10, 2)
    const rows = BODY.concat(LEGS[frame])
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < 12; c++) {
        const ch = rows[r][c]
        if (ch === ".") continue
        g.fillStyle = PAL[ch]
        g.fillRect(hx + c, hy + r - (r < 13 ? 0 : bob), 1, 1)
    }
    const sx = hx - 8, sy = Math.round(56 + Math.sin(t * 3) * 2), arm = 1 + (Math.floor(t * 7) % 2)
    g.fillStyle = accent
    g.fillRect(sx - arm, sy, arm * 2 + 1, 1)
    g.fillRect(sx, sy - arm, 1, arm * 2 + 1)
    g.fillStyle = "#fff"
    g.fillRect(sx, sy, 1, 1)
}

export default function GamePortal(props) {
    const { url, title, tag, button, openIn, accent, radius } = props
    const canvas = useRef<HTMLCanvasElement>(null)
    const hover = useRef(false)
    const [open, setOpen] = useState(false)
    const [hot, setHot] = useState(false)

    useEffect(() => {
        const g = canvas.current?.getContext("2d")
        if (!g) return
        const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        let raf = 0, lit = 0, last = performance.now(), t = 0
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            t += dt
            lit += ((hover.current ? 1 : 0) - lit) * Math.min(1, dt * 5)
            drawScene(g, t, lit, accent)
            if (!still) raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [accent])

    const enter = () => { hover.current = true; setHot(true) }
    const leave = () => { hover.current = false; setHot(false) }
    const go = () => {
        if (openIn === "overlay") setOpen(true)
        else window.open(url, "_blank", "noopener")
    }
    const mono = '"Geist Mono", ui-monospace, monospace'

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`${title}. ${button}`}
            onClick={go}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go() } }}
            onMouseEnter={enter}
            onMouseLeave={leave}
            onFocus={enter}
            onBlur={leave}
            style={{
                position: "relative", width: "100%", height: "100%", minHeight: 220, overflow: "hidden", cursor: "pointer",
                borderRadius: radius, background: "#1b1d1f", border: "1px solid #3a3c40", outline: "none",
                boxShadow: hot ? `0 0 0 3px ${accent}33` : "none", transition: "box-shadow .25s",
            }}
        >
            <canvas ref={canvas} width={W} height={H}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(27,29,31,.55) 0%, rgba(27,29,31,0) 38%, rgba(27,29,31,.82) 100%)" }} />
            <span style={{
                position: "absolute", top: 16, left: 16, padding: "5px 9px", borderRadius: 4, background: "#d9f5dc", color: "#1f3a25",
                font: `500 10px ${mono}`, letterSpacing: ".08em", textTransform: "uppercase",
            }}>{tag}</span>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, color: "#f4f1ff", font: '400 clamp(22px, 3.2vw, 34px)/1.1 "Playfair Display", Georgia, serif', letterSpacing: "-.01em", maxWidth: "16ch" }}>{title}</h3>
                <span style={{
                    padding: "10px 14px", borderRadius: 999, background: hot ? accent : "#f4f1ff", color: "#17171c", whiteSpace: "nowrap",
                    font: `500 11px ${mono}`, letterSpacing: ".1em", transition: "background .2s, transform .2s", transform: hot ? "translateY(-2px)" : "none",
                }}>▶ {button}</span>
            </div>
            {open && typeof document !== "undefined" && createPortal(
                <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#06060f" }}>
                    <iframe src={url} title={title} allow="autoplay; fullscreen; clipboard-write" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
                    <button onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                        style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", padding: "8px 14px", borderRadius: 999, border: "1px solid #3a3c40", background: "rgba(27,29,31,.85)", color: "#f4f1ff", cursor: "pointer", font: `500 11px ${mono}`, letterSpacing: ".1em" }}>
                        ✕ BACK TO PORTFOLIO
                    </button>
                </div>,
                document.body
            )}
        </div>
    )
}

GamePortal.defaultProps = {
    url: "https://your-game.vercel.app",
    title: "Walk through my work.",
    tag: "Playable portfolio",
    button: "PRESS START",
    openIn: "newTab",
    accent: "#b79bff",
    radius: 16,
}

addPropertyControls(GamePortal, {
    url: { type: ControlType.String, title: "Game URL" },
    title: { type: ControlType.String, title: "Headline" },
    tag: { type: ControlType.String, title: "Tag" },
    button: { type: ControlType.String, title: "Button" },
    openIn: { type: ControlType.Enum, title: "Open in", options: ["newTab", "overlay"], optionTitles: ["New tab", "Full-screen overlay"] },
    accent: { type: ControlType.Color, title: "Accent" },
    radius: { type: ControlType.Number, title: "Radius", min: 0, max: 40, step: 1 },
})
