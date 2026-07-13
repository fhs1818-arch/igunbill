export function isFileBackupAvailable() {
  return false;
}

export async function backupDatabaseFile() {
  throw new Error("Vercel 서버리스 환경에서는 파일 복사 백업을 지원하지 않습니다.");
}
