import React from "react"
import { Link } from "gatsby"

interface PaginationProps {
  currentPage: number
  totalPage: number
}

const Pagination = ({ currentPage, totalPage }: PaginationProps) => {
  return (
    <nav className="pagination" aria-label="Posts pagination">
      <div>
        {currentPage - 1 > 0 && (
          <Link
            className="pagination-link"
            to={"/posts/" + (currentPage - 1 === 1 ? "" : currentPage - 1)}
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
            to={"/posts/" + (currentPage + 1)}
            rel="next"
          >
            下一页 <span>→</span>
          </Link>
        )}
      </div>
    </nav>
  )
}

export default Pagination
