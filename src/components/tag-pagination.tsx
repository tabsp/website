import React from "react"
import { Link } from "gatsby"

interface TagPaginationProps {
  currentPage: number
  totalPage: number
  tagSlug?: string
  tag?: string
}

const TagPagination = ({
  currentPage,
  totalPage,
  tagSlug,
  tag,
}: TagPaginationProps) => {
  const slug = tagSlug || tag

  if (!slug) {
    return null
  }
  const basePath = `/tags/${slug}`

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
            to={
              currentPage - 1 === 1
                ? basePath
                : `${basePath}/${currentPage - 1}`
            }
            rel="prev"
          >
            ← 上一页
          </Link>
        )}
      </div>
      <div>
        {currentPage + 1 <= totalPage && (
          <Link to={`${basePath}/${currentPage + 1}`} rel="next">
            下一页 →
          </Link>
        )}
      </div>
    </div>
  )
}

export default TagPagination
