import React from "react"
import { useStaticQuery, graphql, Link } from "gatsby"

import { GatsbyImage } from "gatsby-plugin-image"
const Signature = ({ postUrl }) => {
  const data = useStaticQuery(graphql`
    query authorQuery {
      avatar: file(absolutePath: { regex: "/profile-pic.jpg/" }) {
        childImageSharp {
	  gatsbyImageData(layout: FIXED, width: 50, height: 50, quality: 95)
        }
      }
      site {
        siteMetadata {
          author {
            name
          }
          siteUrl
          social {
            github
          }
        }
      }
    }
  `)
  const siteUrl = data.site.siteMetadata?.siteUrl
  const author = data.site.siteMetadata?.author
  const social = data.site.siteMetadata?.social
  const avatar = data?.avatar?.childImageSharp?.gatsbyImageData
  const thisPost = siteUrl + postUrl
  return (
    <div className="signature">
      <div>
        <p>
          本文地址：
          <Link to={thisPost}>{thisPost}</Link> 
        </p>
        <p>版权声明：<Link to="https://creativecommons.org/licenses/by-nc-nd/3.0/deed.zh">自由转载-非商用-非衍生-保持署名（创意共享3.0许可证）</Link></p>
      </div>
      <div className="bio">
        {avatar && (
          <GatsbyImage
            image={avatar}
            alt={author?.name || ``}
            className="bio-avatar"
            imgStyle={{
              borderRadius: `50%`,
            }}
          />
        )}
        {author?.name && (
          <p>
            Written by <strong>{author.name}</strong> {author?.summary || null}
            <br></br>
            <a href={`https://github.com/${social?.github || ``}`}>
              You can follow me on GitHub
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

export default Signature
