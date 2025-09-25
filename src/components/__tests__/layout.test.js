import React from "react"
import { render, screen } from "@testing-library/react"

import Layout from "../layout"

const buildLocation = pathname => ({ pathname })

describe("Layout", () => {
  it("renders a home heading on the root path", () => {
    render(
      <Layout location={buildLocation("/")} title="Tabsp">
        <p>Content</p>
      </Layout>
    )

    expect(screen.getByRole("heading", { level: 1, name: /tabsp/i })).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("renders a link header on non-root pages", () => {
    render(
      <Layout location={buildLocation("/posts")} title="Tabsp">
        <p>Content</p>
      </Layout>
    )

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Tabsp/i }).getAttribute("href")).toBe("/")
  })
})
