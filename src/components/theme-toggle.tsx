import React, { useState, useCallback, useEffect } from "react"

const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark"
    const stored = localStorage.getItem("theme") as "light" | "dark" | null
    return stored === "dark" || stored === "light" ? stored : "dark"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.setAttribute("data-theme", next)

    const iframe = document.querySelector<HTMLIFrameElement>(
      "iframe.giscus-frame",
    )
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme: next === "dark" ? "dark" : "light",
            },
          },
        },
        "https://giscus.app",
      )
    }
  }, [theme])

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span aria-hidden="true">{theme === "light" ? "◐" : "☼"}</span>
    </button>
  )
}

export default ThemeToggle
