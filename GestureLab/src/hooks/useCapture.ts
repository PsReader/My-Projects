import { useCallback } from "react"
import * as THREE from "three"

export function useCapture(gl: THREE.WebGLRenderer) {
  const takeScreenshot = useCallback(() => {
    const canvas = gl.domElement
    const dataUrl = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = `gesturelab-${Date.now()}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [gl])

  return { takeScreenshot }
}
