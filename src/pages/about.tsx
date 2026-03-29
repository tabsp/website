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
      <h2>联系我</h2>
      <a href="mailto:tabsp@qq.com">tabsp@qq.com</a>
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
