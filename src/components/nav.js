import React from "react"
import { Link } from "gatsby"

const Nav = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        borderBottom: "1px solid #d3d3d3",
        paddingBottom: "10px",
        marginBottom: "10px"
      }}
    >
      <Link style={{ fontSize: "1.5rem" }} to="/">
        Home
      </Link>
      <Link style={{ fontSize: "1.5rem" }} to="/posts">
        Posts
      </Link>
      <Link style={{ fontSize: "1.5rem" }} to="/tags">
        Tags
      </Link>
      <Link style={{ fontSize: "1.5rem" }} to="/about">
        About
      </Link>
    </div>
  )
}

export default Nav
