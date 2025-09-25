import React from "react"
import { render, screen } from "@testing-library/react"

import TagPagination from "../tag-pagination"

describe("TagPagination", () => {
  it("uses the provided tagSlug in navigation links", () => {
    render(
      <TagPagination currentPage={2} totalPage={4} tagSlug="node-js" tag="Node" />
    )

    expect(screen.getByRole("link", { name: "← 上一页" })).toHaveAttribute(
      "href",
      "/tags/node-js/"
    )
    expect(screen.getByRole("link", { name: "下一页 →" })).toHaveAttribute(
      "href",
      "/tags/node-js/3"
    )
  })

  it("falls back to tag when tagSlug is missing", () => {
    render(<TagPagination currentPage={1} totalPage={2} tag="ops" />)

    expect(screen.queryByRole("link", { name: "← 上一页" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "下一页 →" })).toHaveAttribute(
      "href",
      "/tags/ops/2"
    )
  })
})
