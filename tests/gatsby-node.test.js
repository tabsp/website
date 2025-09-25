jest.mock("gatsby-source-filesystem", () => ({
  createFilePath: jest.fn(),
}))

describe("gatsby-node createPages", () => {
  const actions = {
    createPage: jest.fn(),
    createRedirect: jest.fn(),
  }
  const reporter = {
    panicOnBuild: jest.fn(),
  }

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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("creates slugged tag pages and redirects legacy paths", async () => {
    const { createPages } = require("../gatsby-node")

    await createPages({ graphql: mockGraphql, actions, reporter })

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
      })
    )
    expect(actions.createRedirect).not.toHaveBeenCalledWith(
      expect.objectContaining({ fromPath: "/tags/devops" })
    )
  })
})
