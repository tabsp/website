import React from "react"
import type { GatsbySSR } from "gatsby"
import Prism from "prismjs"

if (Prism) {
  import("prismjs/components/prism-nginx")
}

export const onRenderBody: GatsbySSR["onRenderBody"] = ({
  setPreBodyComponents,
}) => {
  setPreBodyComponents([
    React.createElement("script", {
      key: "theme",
      dangerouslySetInnerHTML: {
        __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t)})()`,
      },
    }),
  ])
}
