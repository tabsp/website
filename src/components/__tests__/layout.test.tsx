import React from "react"
import { render, screen } from "@testing-library/react"
// @ts-expect-error - @gatsbyjs/reach-router doesn't have type definitions
import { LocationProvider } from "@gatsbyjs/reach-router"

import Layout from "../layout"

const buildLocation = (pathname: string) => ({ pathname })

describe("Layout", () => {
  it("renders a home heading on the root path", () => {
    render(
      <LocationProvider location={buildLocation("/")}>
        <Layout location={buildLocation("/")} title="Tabsp">
          <p>Content</p>
        </Layout>
      </LocationProvider>,
    )

    expect(
      screen.getByRole("heading", { level: 1, name: /tabsp/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("renders a link header on non-root pages", () => {
    render(
      <LocationProvider location={buildLocation("/posts")}>
        <Layout location={buildLocation("/posts")} title="Tabsp">
          <p>Content</p>
        </Layout>
      </LocationProvider>,
    )

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /Tabsp/i }).getAttribute("href"),
    ).toBe("/")
  })
})
