import baseSlugify from "slugify"

// Generate URL-friendly slugs with full Unicode support and simple transliteration
const slugify = (value: string): string =>
  baseSlugify(value, {
    lower: true,
    strict: true,
    trim: true,
  })

export default slugify
