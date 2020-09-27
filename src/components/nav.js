import React from "react"

const Nav = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <a style={{ fontSize: "1.5rem" }} href="/">
        Home
      </a>
      <a style={{ fontSize: "1.5rem" }} href="/posts">
        Posts
      </a>
      <a style={{ fontSize: "1.5rem" }} href="/tags">
        Tags
      </a>
      <a style={{ fontSize: "1.5rem" }} href="/about">
        About
      </a>
    </div>
  )
}

export default Nav