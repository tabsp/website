import type { Node } from "gatsby-plugin-feed"

interface SiteData {
  siteMetadata: {
    siteUrl: string
  }
}

interface MarkdownNode extends Node {
  excerpt: string
  html: string
  fields: {
    slug: string
  }
  frontmatter: {
    description: string
    date: string
    title: string
  }
}

interface SerializeArgs {
  query: {
    site: SiteData
    allMarkdownRemark: {
      nodes: MarkdownNode[]
    }
  }
}

export const rssSerialize = ({
  query: { site, allMarkdownRemark },
}: SerializeArgs) => {
  return allMarkdownRemark.nodes.map(node => {
    return Object.assign({}, node.frontmatter, {
      description: node.excerpt,
      date: node.frontmatter.date,
      url: site.siteMetadata.siteUrl + node.fields.slug,
      guid: site.siteMetadata.siteUrl + node.fields.slug,
      custom_elements: [{ "content:encoded": node.html }],
    })
  })
}
