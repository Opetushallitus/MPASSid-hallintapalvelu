import { clientPromise } from "@/api";

let hasInterceptor = false;

export default function APIRedirectResponseHandler() {
  if (!hasInterceptor) {
    hasInterceptor = true;
    throw (async () => {
      const axios = await clientPromise;
      axios.interceptors.response.use(
        (response) => response,
        (error) => {
          if (
            error.response.status === 302 &&
            error.response.headers.location
          ) {
            window.location.replace(error.response.headers.location);
          }
          return Promise.reject(error);
        }
      );
    })();
  }

  return null;
}
