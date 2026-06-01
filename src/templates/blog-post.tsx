import React, { useEffect } from "react"
import { Link, graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import Signature from "../components/signature"
import Giscus from "../components/giscus"
import ReadingProgress from "../components/reading-progress"
import CopyCodeButtons from "../components/copy-code-button"

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

  useEffect(() => {
    const content = document.querySelector(".blog-post-content")
    const tocLinks = document.querySelectorAll(
      ".blog-post-toc-contents a[href^='#']",
    )
    if (!content || tocLinks.length === 0) return

    const headings = Array.from(
      content.querySelectorAll(
        "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
      ),
    )
    if (headings.length === 0) return

    let ticking = false
    const updateActiveHeading = () => {
      let current: Element | undefined
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i]
        if (!heading) continue
        if (heading.getBoundingClientRect().top <= 120) {
          current = heading
          break
        }
      }

      tocLinks.forEach(link => link.classList.remove("active"))

      if (current) {
        const id = current.getAttribute("id")
        if (id) {
          for (const link of tocLinks) {
            const href = link.getAttribute("href")
            if (href && decodeURIComponent(href.slice(1)) === id) {
              link.classList.add("active")
              break
            }
          }
        }
      }
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveHeading()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    updateActiveHeading()

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <Layout location={location} title={siteTitle}>
      <ReadingProgress />
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
          <CopyCodeButtons />
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
