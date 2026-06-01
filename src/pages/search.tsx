import React, { useEffect, useState, useCallback, useRef } from "react"
import { Link, graphql, PageProps } from "gatsby"
import Fuse, { type IFuseOptions } from "fuse.js"

import Layout from "../components/layout"
import Seo from "../components/seo"

interface SearchItem {
  title: string
  slug: string
  date: string
  description: string
  tags: string[]
  excerpt: string
}

interface SearchData {
  site: {
    siteMetadata: {
      title: string
    }
  }
}

const SearchPage: React.FC<PageProps<SearchData>> = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ item: SearchItem }[]>([])
  const fuseRef = useRef<Fuse<SearchItem> | null>(null)

  useEffect(() => {
    fetch("/search-index.json")
      .then(r => r.json())
      .then((items: SearchItem[]) => {
        const options: IFuseOptions<SearchItem> = {
          keys: [
            { name: "title", weight: 0.4 },
            { name: "tags", weight: 0.3 },
            { name: "description", weight: 0.2 },
            { name: "excerpt", weight: 0.1 },
          ],
          threshold: 0.3,
          includeScore: true,
        }
        fuseRef.current = new Fuse(items, options)
      })
      .catch(() => {
        fuseRef.current = null
      })
  }, [])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (!fuseRef.current || !value.trim()) {
      setResults([])
      return
    }
    setResults(fuseRef.current.search(value.trim()).slice(0, 20))
  }, [])

  return (
    <Layout location={location} title={siteTitle}>
      <div className="search-page">
        <div className="search-input-wrapper">
          <span className="search-input-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search posts…"
            value={query}
            onChange={handleInput}
          />
        </div>

        <div className="search-results">
          {!query.trim() && (
            <p className="search-empty">
              Type to search posts by title, tag, or content.
            </p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="search-empty">No posts found.</p>
          )}
          {results.map(({ item }) => (
            <article key={item.slug} className="search-result-item">
              <h2>
                <Link to={item.slug}>{item.title}</Link>
              </h2>
              <p>{item.description || item.excerpt}</p>
              <div className="search-result-meta">
                {item.date && (
                  <span className="search-result-tag">{item.date}</span>
                )}
                {item.tags?.map(tag => (
                  <span key={tag} className="search-result-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default SearchPage

export const Head: React.FC = () => <Seo title="Search" />

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
