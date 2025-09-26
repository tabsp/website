import React from "react"
import PropTypes from "prop-types"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import NoPostFound from "../components/no-post-found"
import Pagination from "../components/pagination"

const BlogPosts = ({ data, pageContext, location }) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const posts = data.allMarkdownRemark.nodes
  const { totalPage, currentPage } = pageContext
  if (posts.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <NoPostFound />
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      {posts.map(post => {
        const title = post.frontmatter.title || post.fields.slug
        const readingMinutes = post.fields?.readingTimeMinutes
        return (
          <article
            key={post.fields.slug}
            className="post-list-item"
            itemScope
            itemType="http://schema.org/Article"
          >
            <header>
              <h2>
                <Link to={post.fields.slug} itemProp="url">
                  <span itemProp="headline">{title}</span>
                </Link>
              </h2>
              <small>{post.frontmatter.date}</small>
              {readingMinutes ? (
                <small className="post-reading-time-inline">
                  约 {readingMinutes} 分钟
                </small>
              ) : null}
            </header>
            <section>
              <p
                dangerouslySetInnerHTML={{
                  __html: post.frontmatter.description || post.excerpt,
                }}
                itemProp="description"
              />
            </section>
          </article>
        )
      })}
      <Pagination currentPage={currentPage} totalPage={totalPage} />
    </Layout>
  )
}

const postNodeShape = PropTypes.shape({
  fields: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    readingTimeMinutes: PropTypes.number,
  }).isRequired,
  frontmatter: PropTypes.shape({
    date: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  excerpt: PropTypes.string,
})

BlogPosts.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    allMarkdownRemark: PropTypes.shape({
      nodes: PropTypes.arrayOf(postNodeShape).isRequired,
    }).isRequired,
  }).isRequired,
  pageContext: PropTypes.shape({
    totalPage: PropTypes.number.isRequired,
    currentPage: PropTypes.number.isRequired,
  }).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
}

export default BlogPosts

export const Head = () => <Seo title="All posts" />

export const pageQuery = graphql`
  query($skip: Int!, $limit: Int!) {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      sort: { frontmatter: { date: DESC } }
      limit: $limit
      skip: $skip
    ) {
      nodes {
        excerpt
        fields {
          slug
          readingTimeMinutes
        }
        frontmatter {
          date(formatString: "yyyy-MM-DD")
          title
          description
        }
      }
    }
  }
`
