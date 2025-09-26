/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"

const Seo = ({ description = ``, lang = `en`, meta = [], title }) => {
  const { site } = useStaticQuery(
    graphql`
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
    `
  )

  const metaDescription = description || site.siteMetadata.description
  const defaultTitle = site.siteMetadata?.title
  const metaTags = [
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

Seo.propTypes = {
  description: PropTypes.string,
  lang: PropTypes.string,
  meta: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string.isRequired,
}

export default Seo
