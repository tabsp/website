import React from "react"
import { Link, graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"

interface NotFoundData {
  site: {
    siteMetadata: {
      title: string
    }
  }
}

const NotFoundPage: React.FC<PageProps<NotFoundData>> = ({
  data,
  location,
}) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout location={location} title={siteTitle}>
      <div className="not-found-page">
        <h1>404</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="home-link">
          ← Back to Home
        </Link>
      </div>
    </Layout>
  )
}

export default NotFoundPage

export const Head: React.FC = () => <Seo title="404: Not Found" />

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
