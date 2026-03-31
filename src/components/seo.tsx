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
  date?: string
  image?: string
  isArticle?: boolean
}

interface SiteData {
  site: {
    siteMetadata: {
      title: string
      description: string
      social: {
        github: string
      }
      siteUrl: string
    }
  }
}

const Seo = ({
  description = ``,
  lang = `en`,
  meta = [],
  title,
  date,
  image,
  isArticle = false,
}: SeoProps) => {
  const { site } = useStaticQuery<SiteData>(graphql`
    query {
      site {
        siteMetadata {
          title
          description
          social {
            github
          }
          siteUrl
        }
      }
    }
  `)

  const metaDescription = description || site.siteMetadata.description
  const defaultTitle = site.siteMetadata?.title
  const siteUrl = site.siteMetadata?.siteUrl
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
      content: isArticle ? `article` : `website`,
    },
    {
      property: `og:url`,
      content: siteUrl,
    },
    {
      name: `twitter:card`,
      content: `summary`,
    },
    {
      name: `twitter:creator`,
      content: site.siteMetadata?.social?.github || ``,
    },
    {
      name: `twitter:title`,
      content: title,
    },
    {
      name: `twitter:description`,
      content: metaDescription,
    },
  ]

  if (image) {
    metaTags.push(
      { property: `og:image`, content: image },
      { name: `twitter:image`, content: image },
    )
  }

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
      <script type="application/ld+json">
        {JSON.stringify(
          isArticle
            ? {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: title,
                datePublished: date,
                description: metaDescription,
                url: siteUrl,
                author: {
                  "@type": "Person",
                  name: site.siteMetadata?.title,
                },
                publisher: {
                  "@type": "Organization",
                  name: site.siteMetadata?.title,
                  logo: {
                    "@type": "ImageObject",
                    url: `${siteUrl}/icon.png`,
                  },
                },
                mainEntityOfPage: {
                  "@type": "WebPage",
                  "@id": siteUrl,
                },
              }
            : {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: site.siteMetadata?.title,
                description: site.siteMetadata?.description,
                url: siteUrl,
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${siteUrl}/?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
        )}
      </script>
    </>
  )
}

export default Seo
