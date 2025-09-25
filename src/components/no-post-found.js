import React from "react"

const NoPostFound = () => {
  return (
    <div>
      No blog posts found. Add markdown posts to <code>content/blog</code> (or the
      directory you specified for the <code>gatsby-source-filesystem</code> plugin in
      <code>gatsby-config.js</code>.
    </div>
  )
}

export default NoPostFound
