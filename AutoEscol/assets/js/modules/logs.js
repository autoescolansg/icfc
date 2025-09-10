
const KEY='autoescolaLogsV1';
export function pushLog(text){
  try{
    const now = new Date().toISOString();
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
    arr.unshift({ ts:now, text });
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0,500)));
  }catch(_){}
}
