import React from "react"
import { Link, graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import Signature from "../components/signature"
import Giscus from "../components/giscus"

interface PostEdge {
  fields: {
    slug: string
    readingTimeMinutes?: number
  }
  frontmatter: {
    title: string
  }
}

interface BlogPostData {
  site: {
    siteMetadata: {
      title: string
    }
  }
  markdownRemark: {
    excerpt?: string
    tableOfContents?: string
    html: string
    fields?: {
      readingTimeMinutes?: number
    }
    frontmatter: {
      title: string
      date: string
      description?: string
    }
  }
}

interface BlogPostContext {
  previous?: PostEdge
  next?: PostEdge
  slug: string
}

const BlogPostTemplate: React.FC<PageProps<BlogPostData, BlogPostContext>> = ({
  data,
  pageContext,
  location,
}) => {
  const post = data.markdownRemark
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const { previous, next, slug } = pageContext
  const readingMinutes = post.fields?.readingTimeMinutes
  const [scrollProgress, setScrollProgress] = React.useState(0)

  React.useEffect(() => {
    const handleScroll = () => {
      const article = document.querySelector(".blog-post-content")
      if (!article) return

      const articleTop = article.offsetTop
      const articleHeight = article.offsetHeight
      const windowHeight = window.innerHeight
      const scrollTop = window.scrollY

      const progress = Math.min(
        100,
        Math.max(
          0,
          ((scrollTop - articleTop + windowHeight) / articleHeight) * 100,
        ),
      )
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <Layout location={location} title={siteTitle}>
      <div
        className="reading-progress-bar"
        style={{ "--progress": `${scrollProgress}%` } as React.CSSProperties}
      />
      <article
        className="blog-post"
        itemScope
        itemType="http://schema.org/Article"
      >
        <header>
          <h1 itemProp="headline">{post.frontmatter.title}</h1>
          <p>
            {post.frontmatter.date}
            {readingMinutes ? (
              <span className="post-meta-separator"> · </span>
            ) : null}
            {readingMinutes ? (
              <span className="post-reading-time">
                预计阅读 ~{readingMinutes} 分钟
              </span>
            ) : null}
          </p>
        </header>
        <div className="blog-post-body">
          <aside className="blog-post-aside">
            <div className="blog-post-toc">
              <div className="blog-post-toc-title">目录</div>
              <div className="blog-post-toc-contents">
                <div
                  dangerouslySetInnerHTML={{
                    __html: post.tableOfContents || "",
                  }}
                />
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
        <ul>
          <li>
            {previous ? (
              <Link to={previous.fields.slug} rel="prev">
                <span className="nav-direction">← 上一篇</span>
                <span className="nav-title">{previous.frontmatter.title}</span>
              </Link>
            ) : (
              <div
                style={{
                  opacity: 0.3,
                  padding: "var(--spacing-4) var(--spacing-6)",
                }}
              >
                <span className="nav-direction">← 上一篇</span>
                <span className="nav-title">没有了</span>
              </div>
            )}
          </li>
          <li>
            {next ? (
              <Link to={next.fields.slug} rel="next">
                <span className="nav-direction">下一篇 →</span>
                <span className="nav-title">{next.frontmatter.title}</span>
              </Link>
            ) : (
              <div
                style={{
                  opacity: 0.3,
                  padding: "var(--spacing-4) var(--spacing-6)",
                }}
              >
                <span className="nav-direction">下一篇 →</span>
                <span className="nav-title">没有了</span>
              </div>
            )}
          </li>
        </ul>
      </nav>

      <Giscus />
    </Layout>
  )
}

export default BlogPostTemplate

interface HeadProps {
  data: BlogPostData
}

export const Head: React.FC<HeadProps> = ({ data }) => {
  const post = data?.markdownRemark

  return (
    <Seo
      title={post?.frontmatter?.title ?? `Post`}
      description={post?.frontmatter?.description || post?.excerpt || ``}
      date={post?.frontmatter?.date}
      isArticle={true}
    />
  )
}

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
