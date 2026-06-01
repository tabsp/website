import React from "react"
import { Link } from "gatsby"
import ThemeToggle from "./theme-toggle"

const Nav = () => {
  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-links">
        <Link to="/" className="nav-link" activeClassName="active">
          Home
        </Link>
        <Link to="/posts" className="nav-link" activeClassName="active">
          Posts
        </Link>
        <Link to="/tags" className="nav-link" activeClassName="active">
          Tags
        </Link>
        <Link to="/search" className="nav-link" activeClassName="active">
          Search
        </Link>
        <Link to="/about" className="nav-link" activeClassName="active">
          About
        </Link>
      </div>
      <div className="nav-actions">
        <ThemeToggle />
      </div>
    </nav>
  )
}

export default Nav
