// 로그인 없이 브라우저를 구분하는 익명 ID. 처음 한 번 만들어 localStorage에 저장하고,
// 정산 기록 요청마다 X-Client-Id 헤더로 보낸다. (지난 프로젝트와 동일한 패턴)
const KEY = "dutch-calc-client-id";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
