import React from "react"
import PropTypes from "prop-types"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import Signature from "../components/signature"
import Giscus from "../components/giscus"

const BlogPostTemplate = ({ data, pageContext, location }) => {
  const post = data.markdownRemark
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const { previous, next, slug } = pageContext
  const readingMinutes = post.fields?.readingTimeMinutes

  return (
    <Layout location={location} title={siteTitle}>
      <Seo
        title={post.frontmatter.title}
        description={post.frontmatter.description || post.excerpt}
      />
      <article className="blog-post" itemScope itemType="http://schema.org/Article">
        <header>
          <h1 itemProp="headline">{post.frontmatter.title}</h1>
          <p>
            {post.frontmatter.date}
            {readingMinutes ? <span className="post-meta-separator"> · </span> : null}
            {readingMinutes ? (
              <span className="post-reading-time">预计阅读 ~{readingMinutes} 分钟</span>
            ) : null}
          </p>
        </header>
        <div className="blog-post-body">
          <aside className="blog-post-aside">
            <div className="blog-post-toc">
              <div className="blog-post-toc-title">目录</div>
              <div className="blog-post-toc-contents">
                <div dangerouslySetInnerHTML={{ __html: post.tableOfContents }} />
              </div>
            </div>
          </aside>
          <section
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: post.html }}
            itemProp="articleBody"
          />
        </div>
        <hr />
        <footer>
          <Signature postUrl={slug} />
        </footer>
      </article>
      <nav className="blog-post-nav">
        <ul
          style={{
            display: `flex`,
            flexWrap: `wrap`,
            justifyContent: `space-between`,
            listStyle: `none`,
            padding: 0,
          }}
        >
          <li>
            {previous && (
              <Link to={previous.fields.slug} rel="prev">
                ← {previous.frontmatter.title}
              </Link>
            )}
          </li>
          <li>
            {next && (
              <Link to={next.fields.slug} rel="next">
                {next.frontmatter.title} →
              </Link>
            )}
          </li>
        </ul>
      </nav>

      <Giscus />
    </Layout>
  )
}

const pageEdgeShape = PropTypes.shape({
  fields: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    readingTimeMinutes: PropTypes.number,
  }).isRequired,
  frontmatter: PropTypes.shape({
    title: PropTypes.string.isRequired,
  }).isRequired,
})

BlogPostTemplate.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    markdownRemark: PropTypes.shape({
      excerpt: PropTypes.string,
      tableOfContents: PropTypes.string,
      html: PropTypes.string.isRequired,
      fields: PropTypes.shape({
        readingTimeMinutes: PropTypes.number,
      }).isRequired,
      frontmatter: PropTypes.shape({
        title: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        description: PropTypes.string,
      }).isRequired,
    }).isRequired,
  }).isRequired,
  pageContext: PropTypes.shape({
    previous: pageEdgeShape,
    next: pageEdgeShape,
    slug: PropTypes.string.isRequired,
  }).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      tableOfContents
      html
      fields {
        readingTimeMinutes
      }
      frontmatter {
        title
        date(formatString: "yyyy-MM-DD")
        description
      }
    }
  }
`
