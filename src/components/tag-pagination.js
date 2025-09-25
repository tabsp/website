import React from "react"
import PropTypes from "prop-types"
import { Link } from "gatsby"

const TagPagination = ({ currentPage, totalPage, tagSlug, tag }) => {
  const slug = tagSlug || tag

  if (!slug) {
    return null
  }
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        listStyle: "none",
        padding: 0,
      }}
    >
      <div>
        {currentPage - 1 > 0 && (
          <Link
            to={`/tags/${slug}/` + (currentPage - 1 === 1 ? "" : currentPage - 1)}
            rel="prev"
          >
            ← 上一页
          </Link>
        )}
      </div>
      <div>
        {currentPage + 1 <= totalPage && (
          <Link to={`/tags/${slug}/` + (currentPage + 1)} rel="next">
            下一页 →
          </Link>
        )}
      </div>
    </div>
  )
}

TagPagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPage: PropTypes.number.isRequired,
  tagSlug: PropTypes.string,
  tag: PropTypes.string,
}

export default TagPagination
