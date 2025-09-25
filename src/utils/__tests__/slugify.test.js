const slugify = require("../slugify")

describe("slugify", () => {
  it("normalises casing and whitespace", () => {
    expect(slugify("Android")).toBe("android")
    expect(slugify("  Data Science  ")).toBe("data-science")
  })

  it("collapses duplicate separators and transliterates unicode", () => {
    expect(slugify("Foo   Bar")).toBe("foo-bar")
    expect(slugify("Café")).toBe("cafe")
  })
})
