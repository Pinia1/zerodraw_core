export function fingerprintToInt(fp: string): number {
  let hash = 5381;
  for (let i = 0; i < fp.length; i++) {
    hash = ((hash << 5) + hash) ^ fp.charCodeAt(i);
  }
  const unsignedHash = hash >>> 0;
  const maxSignedInt = 2147483647;
  return unsignedHash <= maxSignedInt ? unsignedHash : -(unsignedHash - maxSignedInt);
}
