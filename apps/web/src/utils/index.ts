//@ts-ignore
const thumbnailUrl = import.meta.env.VITE_IMAGE_THUMBNAIL;
//@ts-ignore
const fileUrl = import.meta.env.VITE_IMAGE_FILE;
//@ts-ignore
const apiUrl = import.meta.env.VITE_API_URL;
//@ts-ignore
const githubClientId = import.meta.env.GITHUB_CLIENT_ID;
//@ts-ignore
const r2Url = import.meta.env.VITE_R2_URL;
//@ts-ignore
const r2ThumbnailUrl = import.meta.env.VITE_R2_THUMBNAIL_URL;

export const getR2Url = (key: string) => `${r2Url}/${key}`;
export const getR2ThumbnailUrl = (key: string, width = 400) =>
  `${r2ThumbnailUrl}/width=${width}/${key}`;

export { apiUrl, fileUrl, githubClientId, thumbnailUrl };
