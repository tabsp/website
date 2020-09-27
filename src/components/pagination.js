import React from "react"
import { Link } from "gatsby"

const Pagination = ({currentPage, totalPage}) => {
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
            to={"/posts/" + (currentPage - 1 === 1 ? "" : currentPage - 1)}
            rel="prev"
          >
            ← 上一页
          </Link>
        )}
      </div>
      <div>
        {currentPage + 1 <= totalPage && (
          <Link to={"/posts/" + (currentPage + 1)} rel="next">
            下一页 →
          </Link>
        )}
      </div>
    </div>
  )
}

export default Pagination
