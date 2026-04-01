declare module "*.css" {
  const content: unknown
  export default content
}

declare module "*.jpg"
declare module "*.jpeg"
declare module "*.png"
declare module "*.svg"

declare module "typeface-montserrat"
declare module "typeface-merriweather"

declare module "@gatsbyjs/reach-router" {
  export function useLocation(): { pathname: string }
  export const Link: React.ComponentType<{
    to: string
    className?: string
    activeClassName?: string
  }>
  export const Router: React.ComponentType<{
    location?: { pathname: string }
    children: React.ReactNode
  }>
}

import "@testing-library/jest-dom"
