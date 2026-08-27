import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useCapture } from "../hooks/useCapture";
import { captureStore, type CaptureApi } from "../captureStore";

export function CaptureBridge() {
  const gl = useThree((state) => state.gl);
  const { takeScreenshot } = useCapture(gl);
  const api = useMemo<CaptureApi>(
    () => ({ takeScreenshot }),
    [takeScreenshot],
  );
  useEffect(() => {
    captureStore.setCapture(api);
  }, [api]);
  return null;
}
