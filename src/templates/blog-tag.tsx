import React from "react"
import { Link, graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import NoPostFound from "../components/no-post-found"
import TagPagination from "../components/tag-pagination"
import slugify from "../utils/slugify"

interface TagPostNode {
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

interface BlogTagData {
  site: {
    siteMetadata: {
      title: string
    }
  }
  allMarkdownRemark: {
    nodes: TagPostNode[]
  }
}

interface BlogTagContext {
  totalPage: number
  currentPage: number
  tag: string
  tagSlug?: string
}

const BlogIndex: React.FC<PageProps<BlogTagData, BlogTagContext>> = ({
  data,
  pageContext,
  location,
}) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const posts = data.allMarkdownRemark.nodes
  const { totalPage, currentPage, tag, tagSlug } = pageContext

  if (posts.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <NoPostFound />
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      <section className="page-hero">
        <p className="section-kicker">$ grep --tag</p>
        <h1>#{tag}</h1>
        <p>{posts.length} 篇文章匹配当前标签。</p>
      </section>

      <section className="post-index post-index-standalone">
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
                    __html: post.frontmatter.description || post.excerpt || "",
                  }}
                  itemProp="description"
                />
                {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                  <div className="post-tags">
                    {post.frontmatter.tags.map(ptag => (
                      <Link
                        key={ptag}
                        to={`/tags/${slugify(ptag)}`}
                        className="post-tag"
                      >
                        {ptag}
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
        <TagPagination
          currentPage={currentPage}
          totalPage={totalPage}
          tagSlug={tagSlug}
          tag={tag}
        />
      </section>
    </Layout>
  )
}

export default BlogIndex

interface HeadProps {
  pageContext: BlogTagContext
}

export const Head: React.FC<HeadProps> = ({ pageContext }) => (
  <Seo title={`# ${pageContext?.tag ?? "All tags"}`} />
)

export const pageQuery = graphql`
  query ($tag: String!, $skip: Int!, $limit: Int!) {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      sort: { frontmatter: { date: DESC } }
      filter: { frontmatter: { tags: { in: [$tag] } } }
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
