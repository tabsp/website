// custom typefaces
// @ts-expect-error - typeface modules don't have type definitions
import "typeface-montserrat"
// @ts-expect-error - typeface modules don't have type definitions
import "typeface-merriweather"
// normalize CSS across browsers
// @ts-expect-error - CSS modules don't have type definitions
import "./src/normalize.css"
// custom CSS styles
// @ts-expect-error - CSS modules don't have type definitions
import "./src/style.css"

// Highlighting for code blocks - CSS only
// gatsby-remark-prismjs handles Prism JS automatically
// @ts-expect-error - CSS modules don't have type definitions
import "prismjs/themes/prism-tomorrow.css"
// @ts-expect-error - CSS modules don't have type definitions
import "prismjs/plugins/line-numbers/prism-line-numbers.css"
// @ts-expect-error - CSS modules don't have type definitions
import "prismjs/plugins/command-line/prism-command-line.css"
