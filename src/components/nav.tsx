import React from "react"
import { Link } from "gatsby"

const Nav = () => {
  return (
    <nav className="nav">
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
        <Link to="/about" className="nav-link" activeClassName="active">
          About
        </Link>
      </div>
    </nav>
  )
}

export default Nav
