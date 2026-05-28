export function isBase64ImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/.test(value)
  );
}
