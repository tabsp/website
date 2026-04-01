import Prism from "prismjs"

if (Prism) {
  // @ts-expect-error - prism-nginx doesn't have type definitions
  import("prismjs/components/prism-nginx")
}
