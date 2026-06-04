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
    <nav className="pagination" aria-label={`${tag || slug} pagination`}>
      <div>
        {currentPage - 1 > 0 && (
          <Link
            className="pagination-link"
            to={
              currentPage - 1 === 1
                ? basePath
                : `${basePath}/${currentPage - 1}`
            }
            rel="prev"
          >
            <span>←</span> 上一页
          </Link>
        )}
      </div>
      <span className="pagination-current">
        {currentPage} / {totalPage}
      </span>
      <div>
        {currentPage + 1 <= totalPage && (
          <Link
            className="pagination-link"
            to={`${basePath}/${currentPage + 1}`}
            rel="next"
          >
            下一页 <span>→</span>
          </Link>
        )}
      </div>
    </nav>
  )
}

export default TagPagination
