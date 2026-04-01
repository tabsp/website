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
      "data-repo": process.env.GATSBY_GISCUS_REPO || "tabsp/comments",
      "data-repo-id": process.env.GATSBY_GISCUS_REPO_ID || "R_kgDOHcCUDA",
      "data-category": process.env.GATSBY_GISCUS_CATEGORY || "Announcements",
      "data-category-id":
        process.env.GATSBY_GISCUS_CATEGORY_ID || "DIC_kwDOHcCUDM4CPbjE",
      "data-mapping": process.env.GATSBY_GISCUS_MAPPING || "pathname",
      "data-strict": process.env.GATSBY_GISCUS_STRICT || "0",
      "data-reactions-enabled": process.env.GATSBY_GISCUS_REACTIONS || "1",
      "data-emit-metadata": process.env.GATSBY_GISCUS_EMIT_METADATA || "0",
      "data-input-position":
        process.env.GATSBY_GISCUS_INPUT_POSITION || "bottom",
      "data-theme": process.env.GATSBY_GISCUS_THEME || "dark",
      "data-lang": process.env.GATSBY_GISCUS_LANG || "en",
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
