import React from "react"
import { Link } from "gatsby"

interface NavProps {
  location: {
    pathname: string
  }
}

const Nav = ({ location }: NavProps) => {
  const isActive = (path: string) => location.pathname === path
  
  return (
    <nav className="nav">
      <div className="nav-links">
        <Link to="/" className={`nav-link${isActive('/') ? ' active' : ''}`}>
          Home
        </Link>
        <Link to="/posts" className={`nav-link${isActive('/posts') ? ' active' : ''}`}>
          Posts
        </Link>
        <Link to="/tags" className={`nav-link${isActive('/tags') ? ' active' : ''}`}>
          Tags
        </Link>
        <Link to="/about" className={`nav-link${isActive('/about') ? ' active' : ''}`}>
          About
        </Link>
      </div>
    </nav>
  )
}

export default Nav
