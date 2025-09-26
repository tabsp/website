import React from "react"
import PropTypes from "prop-types"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import NoPostFound from "../components/no-post-found"
import slugify from "../utils/slugify"

const BlogTags = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const tags = data.allMarkdownRemark.group.map(tag => ({
    ...tag,
    slug: slugify(tag.fieldValue),
  }))
  if (tags.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <Seo title="All tags" />
        <NoPostFound />
      </Layout>
    )
  }
  return (
    <Layout location={location} title={siteTitle}>
      <Seo title="All tags" />
      <div>
        <h1>All tags</h1>
      </div>
      <ul>
        {tags.map(tag => (
          <li key={tag.fieldValue}>
            <Link to={`/tags/${tag.slug}`}>
              {tag.fieldValue} ({tag.totalCount})
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  )
}

BlogTags.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    allMarkdownRemark: PropTypes.shape({
      group: PropTypes.arrayOf(
        PropTypes.shape({
          fieldValue: PropTypes.string.isRequired,
          totalCount: PropTypes.number.isRequired,
        }).isRequired
      ).isRequired,
    }).isRequired,
  }).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
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
      group(field: { frontmatter: { tags: SELECT } } ) {
        fieldValue
        totalCount
      }
    }
  }
`
