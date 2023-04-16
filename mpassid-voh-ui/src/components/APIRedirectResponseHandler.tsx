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
          if (error.response.status === 401) {
            window.location.reload();
          }
          return Promise.reject(error);
        }
      );
    })();
  }

  return null;
}
