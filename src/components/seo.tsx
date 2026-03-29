/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import React from "react"
import { useStaticQuery, graphql } from "gatsby"

interface MetaEntry {
  name?: string
  property?: string
  content: string
}

interface SeoProps {
  description?: string
  lang?: string
  meta?: MetaEntry[]
  title: string
}

interface SiteData {
  site: {
    siteMetadata: {
      title: string
      description: string
      social: {
        github: string
      }
    }
  }
}

const Seo = ({ description = ``, lang = `en`, meta = [], title }: SeoProps) => {
  const { site } = useStaticQuery<SiteData>(graphql`
    query {
      site {
        siteMetadata {
          title
          description
          social {
            github
          }
        }
      }
    }
  `)

  const metaDescription = description || site.siteMetadata.description
  const defaultTitle = site.siteMetadata?.title
  const metaTags: MetaEntry[] = [
    {
      name: `description`,
      content: metaDescription,
    },
    {
      property: `og:title`,
      content: title,
    },
    {
      property: `og:description`,
      content: metaDescription,
    },
    {
      property: `og:type`,
      content: `website`,
    },
    {
      name: `github:card`,
      content: `summary`,
    },
    {
      name: `github:creator`,
      content: site.siteMetadata?.social?.github || ``,
    },
    {
      name: `github:title`,
      content: title,
    },
    {
      name: `github:description`,
      content: metaDescription,
    },
  ]

  const serializedMeta = metaTags.concat(meta).map((entry, index) => {
    if (!entry) {
      return null
    }

    if (entry.name) {
      return (
        <meta
          key={`meta-${entry.name}-${index}`}
          name={entry.name}
          content={entry.content}
        />
      )
    }

    if (entry.property) {
      return (
        <meta
          key={`meta-${entry.property}-${index}`}
          property={entry.property}
          content={entry.content}
        />
      )
    }

    return null
  })

  return (
    <>
      <html lang={lang} />
      <title>{defaultTitle ? `${title} | ${defaultTitle}` : title}</title>
      {serializedMeta}
    </>
  )
}

export default Seo
