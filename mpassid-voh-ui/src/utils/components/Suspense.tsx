import { CircularProgress } from "@mui/material";
import SuspenseOverlay from "suspense-overlay";

export default function Suspense(props) {
  return (
    <SuspenseOverlay
      fallback={<CircularProgress />}
      overlayDelayBaseStyle={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: "#ffffff80",
      }}
      filter="none"
      {...props}
    />
  );
}
