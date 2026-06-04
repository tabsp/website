import { useEffect } from "react"

const CopyCodeButtons = () => {
  useEffect(() => {
    const blocks = document.querySelectorAll(".gatsby-highlight")

    blocks.forEach(block => {
      if (block.querySelector(".copy-code-button")) return

      const button = document.createElement("button")
      button.className = "copy-code-button"
      button.type = "button"
      button.setAttribute("aria-label", "Copy code")
      button.textContent = "Copy"

      let timeout: ReturnType<typeof setTimeout> | null = null

      button.addEventListener("click", async () => {
        const code = block.querySelector("pre")?.textContent || ""
        try {
          await navigator.clipboard.writeText(code)
          button.textContent = "Copied!"
        } catch {
          const textarea = document.createElement("textarea")
          textarea.value = code
          textarea.style.position = "fixed"
          textarea.style.opacity = "0"
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand("copy")
          document.body.removeChild(textarea)
          button.textContent = "Copied!"
        }
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          button.textContent = "Copy"
        }, 2000)
      })

      block.appendChild(button)
    })
  }, [])

  return null
}

export default CopyCodeButtons
