import React from "react"
import { Link, graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import NoPostFound from "../components/no-post-found"
import Pagination from "../components/pagination"
import slugify from "../utils/slugify"

interface PostNode {
  fields: {
    slug: string
    readingTimeMinutes?: number
  }
  frontmatter: {
    date: string
    title: string
    description?: string
    tags?: string[]
  }
  excerpt?: string
}

interface BlogPostsData {
  site: {
    siteMetadata: {
      title: string
    }
  }
  allMarkdownRemark: {
    nodes: PostNode[]
  }
}

interface BlogPostsContext {
  totalPage: number
  currentPage: number
}

const BlogPosts: React.FC<PageProps<BlogPostsData, BlogPostsContext>> = ({
  data,
  pageContext,
  location,
}) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const posts = data.allMarkdownRemark.nodes
  const { totalPage, currentPage } = pageContext
  const isHome = location.pathname === "/" || location.pathname === ""
  const topics = Array.from(
    new Set(posts.flatMap(post => post.frontmatter.tags || [])),
  ).slice(0, 8)

  if (posts.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <NoPostFound />
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      <section className="index-hero">
        <div>
          <p className="section-kicker">$ boot devlog</p>
          <h1>{isHome ? "Tabsp's devlog" : "/posts"}</h1>
          <p className="hero-copy">
            记录技术、思考与实践，构建可复用的知识系统。
          </p>
        </div>
        <div className="vim-status" aria-label="Site status">
          <span className="vim-status-mode">NORMAL</span>
          <strong>{posts.length} buffers</strong>
          <span>~/devlog/index.md</span>
        </div>
      </section>

      <div className="index-grid">
        <section className="post-index" aria-label="Latest posts">
          <div className="section-heading">
            <div>
              <p className="section-kicker">/recent</p>
              <h2>Latest posts</h2>
            </div>
            <span>{posts.length} entries</span>
          </div>

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
                <time className="post-date">{post.frontmatter.date}</time>
                <div className="post-list-main">
                  <h3>
                    <Link to={post.fields.slug} itemProp="url">
                      <span itemProp="headline">{title}</span>
                    </Link>
                  </h3>
                  <p
                    dangerouslySetInnerHTML={{
                      __html:
                        post.frontmatter.description || post.excerpt || "",
                    }}
                    itemProp="description"
                  />
                  {post.frontmatter.tags &&
                    post.frontmatter.tags.length > 0 && (
                      <div className="post-tags">
                        {post.frontmatter.tags.map(tag => (
                          <Link
                            key={tag}
                            to={`/tags/${slugify(tag)}`}
                            className="post-tag"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    )}
                </div>
                <div className="post-list-meta">
                  {readingMinutes ? <span>{readingMinutes} min</span> : null}
                  <Link to={post.fields.slug} aria-label={`Read ${title}`}>
                    →
                  </Link>
                </div>
              </article>
            )
          })}
          <Pagination currentPage={currentPage} totalPage={totalPage} />
        </section>

        <aside className="index-side" aria-label="Site status and topics">
          <section className="side-panel">
            <p className="section-kicker">/system</p>
            <dl className="system-list">
              <div>
                <dt>site</dt>
                <dd>Gatsby</dd>
              </div>
              <div>
                <dt>mode</dt>
                <dd>knowledge index</dd>
              </div>
              <div>
                <dt>status</dt>
                <dd>all systems readable</dd>
              </div>
            </dl>
          </section>

          <section className="side-panel">
            <div className="side-panel-header">
              <p className="section-kicker">/topics</p>
              <Link to="/tags">all →</Link>
            </div>
            <div className="topic-list">
              {topics.map(topic => (
                <Link key={topic} to={`/tags/${slugify(topic)}`}>
                  {topic}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </Layout>
  )
}

export default BlogPosts

export const Head: React.FC = () => <Seo title="All posts" />

export const pageQuery = graphql`
  query ($skip: Int!, $limit: Int!) {
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
          tags
        }
      }
    }
  }
`
