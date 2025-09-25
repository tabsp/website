import React from "react"
import { render, screen } from "@testing-library/react"

import Pagination from "../pagination"

describe("Pagination", () => {
  it("renders previous and next links with correct targets", () => {
    render(<Pagination currentPage={2} totalPage={3} />)

    expect(screen.getByRole("link", { name: "← 上一页" })).toHaveAttribute(
      "href",
      "/posts/"
    )
    expect(screen.getByRole("link", { name: "下一页 →" })).toHaveAttribute(
      "href",
      "/posts/3"
    )
  })

  it("hides the previous link on the first page", () => {
    render(<Pagination currentPage={1} totalPage={3} />)

    expect(screen.queryByRole("link", { name: "← 上一页" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "下一页 →" })).toHaveAttribute(
      "href",
      "/posts/2"
    )
  })
})
