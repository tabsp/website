import React from "react"
import { Link, graphql, PageProps } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import NoPostFound from "../components/no-post-found"
import slugify from "../utils/slugify"

interface TagGroup {
  fieldValue: string
  totalCount: number
}

interface BlogTagsData {
  site: {
    siteMetadata: {
      title: string
    }
  }
  allMarkdownRemark: {
    group: TagGroup[]
  }
}

const BlogTags: React.FC<PageProps<BlogTagsData>> = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const tags = data.allMarkdownRemark.group.map(tag => ({
    ...tag,
    slug: slugify(tag.fieldValue),
  }))
  if (tags.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <NoPostFound />
      </Layout>
    )
  }
  return (
    <Layout location={location} title={siteTitle}>
      <section className="page-hero">
        <p className="section-kicker">$ ls ./topics</p>
        <h1>所有标签</h1>
        <p>按主题浏览技术笔记和实践记录。</p>
      </section>
      <div className="tags-cloud">
        {tags.map(tag => (
          <Link
            key={tag.fieldValue}
            to={`/tags/${tag.slug}`}
            className="tag-item"
          >
            <span>{tag.fieldValue}</span>
            <strong>{tag.totalCount}</strong>
          </Link>
        ))}
      </div>
    </Layout>
  )
}

export default BlogTags

export const Head: React.FC = () => <Seo title="所有标签" />

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(limit: 2000) {
      group(field: { frontmatter: { tags: SELECT } }) {
        fieldValue
        totalCount
      }
    }
  }
`
