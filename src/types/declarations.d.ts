// Type declarations for side-effect CSS imports
declare module "*.css" {
  const content: string
  export default content
}

declare module "typeface-montserrat" {
  const content: void
  export default content
}

declare module "typeface-merriweather" {
  const content: void
  export default content
}

declare module "prismjs/themes/*.css" {
  const content: string
  export default content
}

declare module "prismjs/plugins/*/*.css" {
  const content: string
  export default content
}

declare module "prismjs/components/prism-nginx" {
  const content: void
  export default content
}

declare module "gatsby-plugin-feed" {
  export interface Node {
    [key: string]: unknown
  }
}
