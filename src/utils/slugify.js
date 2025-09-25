const baseSlugify = require("slugify")

// Generate URL-friendly slugs with full Unicode support and simple transliteration
const slugify = value =>
  baseSlugify(value, {
    lower: true,
    strict: true,
    trim: true,
  })

module.exports = slugify
