import React from "react"
import { render, screen } from "@testing-library/react"

import Layout from "../layout"

const buildLocation = (pathname: string) => ({ pathname })

describe("Layout", () => {
  it("renders the site shell on the root path", () => {
    render(
      <Layout location={buildLocation("/")} title="Tabsp">
        <p>Content</p>
      </Layout>,
    )

    expect(screen.getByRole("link", { name: /Tabsp home/i })).toHaveAttribute(
      "href",
      "/",
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("keeps the site mark linked on non-root pages", () => {
    render(
      <Layout location={buildLocation("/posts")} title="Tabsp">
        <p>Content</p>
      </Layout>,
    )

    expect(
      screen.getByRole("link", { name: /Tabsp home/i }).getAttribute("href"),
    ).toBe("/")
  })
})
