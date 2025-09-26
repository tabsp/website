jest.mock("gatsby-source-filesystem", () => ({
  createFilePath: jest.fn(),
}))
jest.mock("reading-time", () => jest.fn(() => ({ minutes: 4.4 })))

const { createFilePath } = require("gatsby-source-filesystem")
const readingTime = require("reading-time")
const gatsbyNode = require("../gatsby-node")

describe("gatsby-node createPages", () => {
  let actions
  let reporter

  beforeEach(() => {
    actions = {
      createPage: jest.fn(),
      createRedirect: jest.fn(),
    }
    reporter = {
      panicOnBuild: jest.fn(),
      info: jest.fn(),
    }
    jest.clearAllMocks()
  })

  it("creates slugged tag pages and redirects legacy paths", async () => {
    const mockGraphql = jest.fn().mockResolvedValue({
      data: {
        site: {
          siteMetadata: {
            pageSize: 2,
          },
        },
        allMarkdownRemark: {
          group: [
            { fieldValue: "Android", totalCount: 3 },
            { fieldValue: "devops", totalCount: 1 },
          ],
          nodes: [
            {
              fields: { slug: "/android/post-1" },
              frontmatter: { title: "Post 1", tags: ["Android"] },
            },
            {
              fields: { slug: "/android/post-2" },
              frontmatter: { title: "Post 2", tags: ["Android"] },
            },
            {
              fields: { slug: "/devops/post-3" },
              frontmatter: { title: "Post 3", tags: ["devops"] },
            },
          ],
        },
      },
    })

    await gatsbyNode.createPages({ graphql: mockGraphql, actions, reporter })

    expect(actions.createPage).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/tags/android" })
    )
    expect(actions.createPage).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/tags/android/2" })
    )
    expect(actions.createRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        fromPath: "/tags/Android",
        toPath: "/tags/android",
        isPermanent: true,
        ignoreCase: false,
      })
    )
    expect(reporter.info).toHaveBeenCalledWith(
      'redirecting legacy tag path from "/tags/Android" to "/tags/android"'
    )
    expect(actions.createRedirect).not.toHaveBeenCalledWith(
      expect.objectContaining({ fromPath: "/tags/devops" })
    )
  })

  it("reports GraphQL errors and stops page creation", async () => {
    const graphqlErrors = [new Error("boom")]
    const mockGraphql = jest.fn().mockResolvedValue({
      errors: graphqlErrors,
    })

    await gatsbyNode.createPages({ graphql: mockGraphql, actions, reporter })

    expect(reporter.panicOnBuild).toHaveBeenCalledWith(
      "There was an error loading your blog posts",
      graphqlErrors
    )
    expect(actions.createPage).not.toHaveBeenCalled()
    expect(actions.createRedirect).not.toHaveBeenCalled()
    expect(reporter.info).not.toHaveBeenCalled()
  })

  it("falls back to a single item page size when metadata is missing", async () => {
    const mockGraphql = jest.fn().mockResolvedValue({
      data: {
        site: {
          siteMetadata: {
            pageSize: null,
          },
        },
        allMarkdownRemark: {
          group: [],
          nodes: [],
        },
      },
    })

    await gatsbyNode.createPages({ graphql: mockGraphql, actions, reporter })

    expect(actions.createPage).toHaveBeenCalledTimes(1)
    expect(actions.createPage).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/posts" })
    )
    expect(actions.createRedirect).not.toHaveBeenCalled()
    expect(reporter.info).not.toHaveBeenCalled()
  })
})

describe("gatsby-node onCreateNode", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    readingTime.mockReturnValue({ minutes: 4.4 })
  })

  it("adds slug and reading time fields to markdown nodes", () => {
    const createNodeField = jest.fn()
    const node = {
      internal: { type: "MarkdownRemark" },
      rawMarkdownBody: "Sample body for reading time",
    }
    const getNode = jest.fn()

    createFilePath.mockReturnValue("/posts/sample/")
    readingTime.mockReturnValue({ minutes: 4.4 })

    gatsbyNode.onCreateNode({ node, actions: { createNodeField }, getNode })

    expect(createFilePath).toHaveBeenCalledWith({ node, getNode })
    expect(createNodeField).toHaveBeenNthCalledWith(1, {
      name: "slug",
      node,
      value: "/posts/sample/",
    })
    expect(createNodeField).toHaveBeenNthCalledWith(2, {
      name: "readingTimeMinutes",
      node,
      value: 4,
    })
    expect(createNodeField).toHaveBeenNthCalledWith(3, {
      name: "readingTimeText",
      node,
      value: "4 min read",
    })
  })

  it("uses a minimum reading time when the body is empty", () => {
    const createNodeField = jest.fn()
    const node = {
      internal: { type: "MarkdownRemark" },
    }
    const getNode = jest.fn()

    createFilePath.mockReturnValue("/posts/empty/")
    readingTime.mockReturnValueOnce({ minutes: 0 })

    gatsbyNode.onCreateNode({ node, actions: { createNodeField }, getNode })

    expect(readingTime).toHaveBeenCalledWith("")
    expect(createNodeField).toHaveBeenNthCalledWith(2, {
      name: "readingTimeMinutes",
      node,
      value: 1,
    })
    expect(createNodeField).toHaveBeenNthCalledWith(3, {
      name: "readingTimeText",
      node,
      value: "1 min read",
    })
  })

  it("ignores non markdown nodes", () => {
    const createNodeField = jest.fn()

    gatsbyNode.onCreateNode({
      node: { internal: { type: "File" } },
      actions: { createNodeField },
      getNode: jest.fn(),
    })

    expect(createNodeField).not.toHaveBeenCalled()
  })
})

describe("gatsby-node createSchemaCustomization", () => {
  it("registers custom types", () => {
    const createTypes = jest.fn()

    gatsbyNode.createSchemaCustomization({ actions: { createTypes } })

    expect(createTypes).toHaveBeenCalledWith(expect.stringContaining("SiteSiteMetadata"))
  })
})
