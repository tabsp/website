import React from "react"
// @ts-expect-error - @gatsbyjs/reach-router doesn't have type definitions
import { Link, useLocation } from "@gatsbyjs/reach-router"

const Nav = () => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <nav className="nav">
      <div className="nav-links">
        <Link to="/" className={`nav-link${isActive("/") ? " active" : ""}`}>
          Home
        </Link>
        <Link
          to="/posts"
          className={`nav-link${isActive("/posts") ? " active" : ""}`}
        >
          Posts
        </Link>
        <Link
          to="/tags"
          className={`nav-link${isActive("/tags") ? " active" : ""}`}
        >
          Tags
        </Link>
        <Link
          to="/about"
          className={`nav-link${isActive("/about") ? " active" : ""}`}
        >
          About
        </Link>
      </div>
    </nav>
  )
}

export default Nav
