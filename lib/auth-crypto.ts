export const normalizeLogin=(v:string)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/[\s._-]+/g,' ');
export const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export const sha256=async(text:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
export function safeEqual(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export async function passwordHash(password:string,salt:string,pepper:string){
 const hmacKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const prehash=await crypto.subtle.sign('HMAC',hmacKey,new TextEncoder().encode(password));
 const key=await crypto.subtle.importKey('raw',prehash,'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256));
}
