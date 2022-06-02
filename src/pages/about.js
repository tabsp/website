import React from "react"
import { graphql } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"

const NotFoundPage = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout location={location} title={siteTitle}>
      <Seo title="About me" />
      <h2>联系我</h2>
      <a href="mailto:tabsp@qq.com">tabsp@qq.com</a>
      <script src="https://giscus.app/client.js"
        data-repo="tabsp/comments"
        data-repo-id="R_kgDOHcCUDA"
        data-category="Announcements"
        data-category-id="DIC_kwDOHcCUDM4CPbjE"
        data-mapping="title"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="https://tabsp.com/giscus/themes/light.css"
        data-lang="zh-CN"
        crossorigin="anonymous"
        async>
      </script>
    </Layout>
  )
}

export default NotFoundPage

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
