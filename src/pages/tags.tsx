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
      <div>
        <h1>所有标签</h1>
      </div>
      <div className="tags-cloud">
        {tags.map(tag => (
          <Link
            key={tag.fieldValue}
            to={`/tags/${tag.slug}`}
            className="tag-item"
          >
            {tag.fieldValue} ({tag.totalCount})
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
