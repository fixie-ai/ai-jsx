export type Os = "linux" | "bsd" | "macos" | "windows"

export const getOs = (): Os => {
  if (navigator.platform.includes("Win")) {
    return "windows"
  }

  if (navigator.platform.includes("Mac")) {
    return "macos"
  }

  if (navigator.platform.includes("Linux")) {
    return "linux"
  }

  if (navigator.platform.includes("BSD")) {
    return "bsd"
  }

  return "linux"
}
