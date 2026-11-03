/**
 * Image resizing for the organisation logo:
 *  - an image that already fits is returned as is (never scaled up),
 *  - the aspect ratio keeps both limits (e.g. 500x200 with 125x36 -> 90x36),
 *  - a missing 2d context or a failed toBlob rejects,
 *  - the object URL is released.
 */

export interface Size {
  width: number;
  height: number;
}

/**
 * The size that fits within maxWidth x maxHeight keeping the aspect ratio,
 * or null when the image already fits (it is never scaled up).
 */
export const fitWithin = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): Size | null => {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  if (!(scale < 1)) {
    return null;
  }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/** Scales the image down to fit maxWidth x maxHeight (the file itself if it already fits). */
export function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const size = fitWithin(image.width, image.height, maxWidth, maxHeight);
        if (size === null) {
          resolve(file);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext("2d");
        if (context === null) {
          reject(new Error("resizeImage: canvas 2d context is not available"));
          return;
        }
        context.drawImage(image, 0, 0, size.width, size.height);
        canvas.toBlob((blob) => {
          if (blob === null) {
            reject(new Error("resizeImage: canvas.toBlob failed"));
          } else {
            resolve(blob);
          }
        }, file.type);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("resizeImage: the image could not be loaded"));
    };
    image.src = url;
  });
}
