/* global HTMLDivElement */
import React, { useEffect, useRef } from "react"

const src = "https://giscus.app/client.js"

const Giscus = () => {
  const rootElm = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootElm.current) return

    const giscus = document.createElement("script")
    const giscusConfig = {
      src,
      "data-repo": "tabsp/comments",
      "data-repo-id": "R_kgDOHcCUDA",
      "data-category": "Announcements",
      "data-category-id": "DIC_kwDOHcCUDM4CPbjE",
      "data-mapping": "pathname",
      "data-strict": "0",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "bottom",
      "data-theme": "dark",
      "data-lang": "en",
      crossorigin: "anonymous",
      async: true,
    }

    Object.keys(giscusConfig).forEach(configKey => {
      const value = giscusConfig[configKey as keyof typeof giscusConfig]
      giscus.setAttribute(configKey, String(value))
    })
    rootElm.current.appendChild(giscus)
  }, [])

  return (
    <>
      <div id="tabsp-comments" className="giscus-comments" ref={rootElm} />
    </>
  )
}

export default Giscus
