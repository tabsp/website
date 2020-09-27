import React from "react"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"
import NoPostFound from "../components/no-post-found"

const BlogTags = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const tags = data.allMarkdownRemark.group
  if (tags.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <SEO title="All tags" />
        <NoPostFound />
      </Layout>
    )
  }
  return (
    <Layout location={location} title={siteTitle}>
      <ul>
        {tags.map(tag => (
          <li key={tag.fieldValue}>
            <Link to={`/tags/${tag.fieldValue}/`}>
              {tag.fieldValue} ({tag.totalCount})
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  )
}

export default BlogTags

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(limit: 2000) {
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }
  }
`
