import React from "react"
import { graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import Giscus from "../components/giscus"

interface AboutData {
  site: {
    siteMetadata: {
      title: string
    }
  }
}

const AboutPage: React.FC<PageProps<AboutData>> = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout location={location} title={siteTitle}>
      <section className="page-hero">
        <p className="section-kicker">$ whoami</p>
        <h1>About</h1>
        <p>写代码，记录问题，整理长期可复用的技术笔记。</p>
      </section>
      <section className="about-grid">
        <div className="side-panel">
          <p className="section-kicker">/contact</p>
          <a className="contact-link" href="mailto:tabsp@qq.com">
            tabsp@qq.com
          </a>
        </div>
        <div className="side-panel">
          <p className="section-kicker">/principles</p>
          <ul className="terminal-list">
            <li>保持简单，但不牺牲表达。</li>
            <li>先解决真实问题，再追求漂亮抽象。</li>
            <li>把踩过的坑写成后来人的路标。</li>
          </ul>
        </div>
      </section>
      <Giscus />
    </Layout>
  )
}

export default AboutPage

export const Head: React.FC = () => <Seo title="About me" />

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
