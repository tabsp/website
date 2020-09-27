const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions

  // Define a template for blog post
  const blogPost = path.resolve(`./src/templates/blog-post.js`)
  const blogPosts = path.resolve(`./src/templates/blog-posts.js`)
  const blogTag = path.resolve("src/templates/blog-tag.js")

  // Get all markdown blog posts sorted by date
  const result = await graphql(
    `
      {
        site {
          siteMetadata {
            pageSize
          }
        }
        allMarkdownRemark(
          sort: { fields: [frontmatter___date], order: DESC }
          limit: 1000
        ) {
          group(field: frontmatter___tags) {
            fieldValue
            totalCount
          }
          nodes {
            fields {
              slug
            }
            frontmatter {
              title
              tags
            }
          }
        }
      }
    `
  )

  if (result.errors) {
    reporter.panicOnBuild(
      `There was an error loading your blog posts`,
      result.errors
    )
    return
  }

  const posts = result.data.allMarkdownRemark.nodes

  const pageSize = result.data.site.siteMetadata?.pageSize || 1
  const totalPage = Math.ceil(posts.length / pageSize)

  Array.from({ length: totalPage }).forEach((_, i) => {
    createPage({
      path: i === 0 ? `/posts` : `/posts/${i + 1}`,
      component: blogPosts,
      context: {
        currentPage: i + 1,
        totalPage: totalPage,
        limit: pageSize,
        skip: i * pageSize,
      },
    })
  })
  // Create blog posts pages
  // But only if there's at least one markdown file found at "content/blog" (defined in gatsby-config.js)
  // `context` is available in the template as a prop and as a variable in GraphQL

  if (posts.length > 0) {
    posts.forEach((post, index) => {
      const previous = index === posts.length - 1 ? null : posts[index + 1]
      const next = index === 0 ? null : posts[index - 1]

      createPage({
        path: post.fields.slug,
        component: blogPost,
        context: {
          slug: post.fields.slug,
          previous,
          next,
        },
      })
    })
  }

  const tags = result.data.allMarkdownRemark.group
  // 创建标签页
  tags.forEach(tag => {
    const total = tag.totalCount
    const numPages = Math.ceil(total / pageSize)
    Array.from({ length: numPages }).forEach((_, i) => {
      createPage({
        path:
          i === 0
            ? `/tags/${tag.fieldValue}`
            : `/tags/${tag.fieldValue}/${i + 1}`,
        component: blogTag,
        context: {
          tag: tag.fieldValue,
          currentPage: i + 1,
          totalPage: numPages,
          limit: pageSize,
          skip: i * pageSize,
        },
      })
    })
  })
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })

    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions

  // Explicitly define the siteMetadata {} object
  // This way those will always be defined even if removed from gatsby-config.js

  // Also explicitly define the Markdown frontmatter
  // This way the "MarkdownRemark" queries will return `null` even when no
  // blog posts are stored inside "content/blog" instead of returning an error
  createTypes(`
    type SiteSiteMetadata {
      author: Author
      siteUrl: String
      social: Social
    }

    type Author {
      name: String
      summary: String
    }

    type Social {
      twitter: String
    }

    type MarkdownRemark implements Node {
      frontmatter: Frontmatter
      fields: Fields
    }

    type Frontmatter {
      title: String
      description: String
      date: Date @dateformat
    }

    type Fields {
      slug: String
    }
  `)
}
