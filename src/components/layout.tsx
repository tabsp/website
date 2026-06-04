import React from "react"
import { Link } from "gatsby"
import Nav from "./nav"
import BackToTop from "./back-to-top"

declare const __PATH_PREFIX__: string

interface LayoutProps {
  location: {
    pathname: string
  }
  title: string
  children: React.ReactNode
}

const Layout = ({ location, title, children }: LayoutProps) => {
  const rootPath = `${__PATH_PREFIX__}/`
  const isRootPath = location.pathname === rootPath
  const shellMode = isRootPath ? "home" : "page"
  const currentYear = new Date().getFullYear()

  return (
    <div
      className="site-shell"
      data-is-root-path={isRootPath}
      data-shell-mode={shellMode}
    >
      <header className="global-header">
        <Link className="site-mark" to="/" aria-label={`${title} home`}>
          <span className="site-mark-prompt">~/</span>
          <span className="site-mark-name">{title}</span>
        </Link>
        <Nav />
      </header>
      <main className="site-main">{children}</main>
      <BackToTop />
      <footer className="site-footer">
        <span>© {currentYear} Tabsp</span>
        <span>
          Built with <a href="https://www.gatsbyjs.com">Gatsby</a>
        </span>
        <span className="footer-command">$ deploy --quiet</span>
      </footer>
    </div>
  )
}

export default Layout
