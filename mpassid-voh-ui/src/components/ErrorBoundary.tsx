import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./ErrorFallback";

export default function ErrorBoundary({ children }: React.PropsWithChildren) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
