import { z } from 'zod';
export const collections = ['books','employees','loans','reservations','suggestions','acquisitions','events','activity'] as const;
export type Collection = typeof collections[number];
export type RecordData = {id:string;[key:string]:any};
export type Settings = {defaultLoanDays:number;maxActiveLoans:number;maxRenewals:number;annualGoal:number;clubName:string};
export type LibraryState = {revision:number;ownerId:string;settings:Settings}&Record<Collection,RecordData[]>;
export const defaultSettings:Settings = {defaultLoanDays:21,maxActiveLoans:2,maxRenewals:2,annualGoal:24,clubName:'Clube de Leitura Grancont'};
export const today = ()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const addDays=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const dayDiff=(date:string,base=today())=>Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(base+'T12:00:00Z'))/86400000);
export const normalize=(s:any)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const available=(s:LibraryState,b:RecordData)=>b.maintenance||b.archived?0:Math.max(0,b.totalCopies-s.loans.filter(l=>l.bookId===b.id&&!l.actualReturnDate).length);
export function emptyState(ownerId=''):LibraryState{return {revision:0,ownerId,settings:{...defaultSettings},books:[],employees:[],loans:[],reservations:[],suggestions:[],acquisitions:[],events:[],activity:[]};}
const str=(n=200)=>z.string().trim().max(n);
const req=(n=200)=>str(n).min(1,'Preencha os campos obrigatórios.');
const id=req(128);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Informe uma data válida.').refine(v=>!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v,'Data inválida.');
const email=z.union([z.string().trim().email().max(150),z.literal('')]).default('');
const cover=z.string().max(600000).default('').refine(v=>!v||v.startsWith('/api/covers?id=')||/^https:\/\//.test(v)||/^data:image\/(png|jpeg|webp);base64,/.test(v),'Use uma imagem PNG, JPEG, WebP ou URL HTTPS.');
const schemas:Record<string,z.ZodTypeAny> = {
 books:z.object({id,title:req(),author:str().default(''),category:str(100).default('Outros'),isbn:str(30).default(''),totalCopies:z.coerce.number().int().min(1).max(1000),pages:z.coerce.number().int().min(0).max(50000).default(0),location:str(100).default(''),description:str(2000).default(''),coverUrl:cover,maintenance:z.boolean().default(false),archived:z.boolean().default(false),createdAt:z.string().optional()}),
 employees:z.object({id,name:req(100),email,department:str(100).default(''),role:z.enum(['reader','admin']).default('reader'),active:z.boolean().default(true),goal:z.coerce.number().int().min(1).max(100).default(6)}),
 loans:z.object({id,bookId:id,employeeId:id,checkoutDate:date,expectedReturnDate:date,actualReturnDate:z.union([date,z.literal('')]).default(''),renewals:z.coerce.number().int().min(0).max(50).default(0),notes:str(500).default(''),feedback:str(1000).default(''),rating:z.coerce.number().int().min(0).max(5).default(0),progress:z.coerce.number().int().min(0).max(100).default(0),completed:z.boolean().default(false),completionConfirmed:z.boolean().default(false),legacy:z.boolean().default(false)}),
 reservations:z.object({id,bookId:id,employeeId:id,createdAt:req(50)}),
 suggestions:z.object({id,title:req(),author:str().default(''),reason:str(1000).default(''),suggesterId:str(128).default(''),voters:z.array(id).max(1000).default([]),status:z.enum(['pending','approved','purchased']).default('pending'),legacyVotes:z.coerce.number().int().min(0).max(10000).default(0),legacy:z.boolean().default(false)}),
 acquisitions:z.object({id,title:req(),author:str().default(''),category:str(100).default('Outros'),totalCopies:z.coerce.number().int().min(1).max(1000).default(1),expectedDate:z.union([date,z.literal('')]).default(''),cost:z.coerce.number().min(0).max(100000).default(0),coverUrl:cover,notes:str(1000).default(''),status:z.enum(['ordered','arrived']).default('ordered')}),
 events:z.object({id,title:req(),date,time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),location:str(200).default(''),bookId:str(128).default(''),description:str(2000).default(''),attendees:z.array(id).max(1000).default([])}),
};
const settingsSchema=z.object({defaultLoanDays:z.coerce.number().int().min(1).max(180),maxActiveLoans:z.coerce.number().int().min(1).max(20),maxRenewals:z.coerce.number().int().min(0).max(10),annualGoal:z.coerce.number().int().min(1).max(10000),clubName:req(100)});
export type Actor={id:string;email:string;name:string;authRole?:'admin'|'reader';employeeId?:string;username?:string};
export function roleOf(s:LibraryState,a:Actor){if(a.authRole)return a.authRole;if(s.ownerId===a.id)return 'admin';return s.employees.find(e=>e.active&&e.email&&e.email.toLowerCase()===a.email.toLowerCase())?.role||null;}
export function applyAction(input:LibraryState,action:any,actor:Actor):LibraryState{
 const s=structuredClone(input);const role=roleOf(s,actor);if(!role)throw new Error('Seu acesso ainda não está cadastrado nesta biblioteca.');
 const mine=s.employees.find(e=>e.active&&(e.id===actor.employeeId||(e.email&&e.email.toLowerCase()===actor.email.toLowerCase())));
 const admin=()=>{if(role!=='admin')throw new Error('Esta ação é exclusiva da administração.');};
 const get=(col:Collection,id:string)=>{const r=s[col].find(r=>r.id===id);if(!r)throw new Error('Registro não encontrado. Atualize a página.');return r;};
 const up=(col:Collection,r:RecordData)=>{const ix=s[col].findIndex(x=>x.id===r.id);if(ix<0)s[col].push(r);else s[col][ix]=r;};
 const requireBook=(id:string)=>{const b=get('books',id);if(b.archived)throw new Error('Este título foi arquivado.');return b;};
 const requireEmployee=(id:string)=>{const e=get('employees',id);if(!e.active)throw new Error('Colaborador inativo.');return e;};
 let label='Registro atualizado';
 if(action.type==='save'){
  const col=action.collection as Collection;if(!schemas[col]||col==='loans'||col==='reservations')throw new Error('Operação não permitida.');
  if(col!=='suggestions')admin();
  const item=schemas[col].parse({...action.record,id:action.record.id||crypto.randomUUID()});
  const prev=s[col].find(x=>x.id===item.id);
  if(col==='books') {const borrowed=s.loans.filter(l=>l.bookId===item.id&&!l.actualReturnDate).length;if(item.totalCopies<borrowed)throw new Error('Há mais exemplares emprestados do que a quantidade informada.');if(item.archived&&(borrowed||s.reservations.some(r=>r.bookId===item.id)))throw new Error('Encerre os empréstimos e reservas antes de arquivar.');item.createdAt=prev?.createdAt||new Date().toISOString();}
  if(col==='employees') {if(item.email&&s.employees.some(e=>e.id!==item.id&&e.email.toLowerCase()===item.email.toLowerCase()))throw new Error('Este e-mail já está cadastrado.');if(!item.active&&(s.loans.some(l=>l.employeeId===item.id&&!l.actualReturnDate)||s.reservations.some(r=>r.employeeId===item.id)))throw new Error('Encerre empréstimos e reservas antes de desativar o colaborador.');}
  if(col==='suggestions'&&role!=='admin'){if(prev)throw new Error('Somente a administração pode editar sugestões.');item.suggesterId=mine?.id||'';item.voters=[];item.status='pending';item.legacyVotes=0;item.legacy=false;}
  if(col==='suggestions'&&prev){item.voters=prev.voters;item.legacyVotes=prev.legacyVotes||0;item.legacy=!!prev.legacy;if(item.status==='purchased'&&prev.status!=='purchased')throw new Error('Use a ação de compra para acompanhar a aquisição.');}
  if(col==='events'){if(item.bookId)requireBook(item.bookId);item.attendees=prev?.attendees||[];}
  if(col==='acquisitions'){item.status=prev?.status||'ordered';if(prev?.status==='arrived')throw new Error('Aquisição já recebida. Edite o título no acervo.');}
  up(col,item);label=`${prev?'Atualização':'Cadastro'}: ${item.title||item.name}`;
 }else if(action.type==='loan'){
  admin();const b=requireBook(action.bookId),e=requireEmployee(action.employeeId);
  if(available(s,b)<1)throw new Error('Não há exemplares disponíveis para empréstimo.');
  const active=s.loans.filter(l=>l.employeeId===e.id&&!l.actualReturnDate);
  if(active.some(l=>l.bookId===b.id))throw new Error('Este leitor já está com um exemplar deste título.');
  if(active.length>=s.settings.maxActiveLoans)throw new Error('O leitor atingiu o limite de empréstimos ativos.');
  const queue=s.reservations.filter(r=>r.bookId===b.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  if(queue.length&&queue[0].employeeId!==e.id)throw new Error('Este exemplar está reservado para o primeiro leitor da fila.');
  const checkout=date.parse(action.checkoutDate||today()),due=date.parse(action.expectedReturnDate||addDays(checkout,s.settings.defaultLoanDays));
  if(checkout>today()||due<checkout)throw new Error('Confira as datas de retirada e devolução.');
  s.loans.push(schemas.loans.parse({id:crypto.randomUUID(),bookId:b.id,employeeId:e.id,checkoutDate:checkout,expectedReturnDate:due,notes:action.notes||''}));
  s.reservations=s.reservations.filter(r=>!(r.bookId===b.id&&r.employeeId===e.id));label=`Empréstimo: ${b.title} → ${e.name}`;
 }else if(action.type==='return'){
  admin();const l=get('loans',action.id);if(l.actualReturnDate)throw new Error('A devolução já foi registrada.');
  l.actualReturnDate=today();l.feedback=str(1000).parse(action.feedback||'');l.rating=z.coerce.number().int().min(0).max(5).parse(action.rating||0);l.completed=!!action.completed;l.completionConfirmed=true;l.progress=action.completed?100:l.progress;label=`Devolução: ${get('books',l.bookId).title}`;
 }else if(action.type==='confirmCompletion'){
  admin();const l=get('loans',action.id);if(!l.actualReturnDate)throw new Error('Registre a devolução primeiro.');l.completed=!!action.completed;l.completionConfirmed=true;if(l.completed)l.progress=100;label='Conclusão da leitura atualizada';
 }else if(action.type==='renew'){
  admin();const l=get('loans',action.id);if(l.actualReturnDate)throw new Error('Empréstimo encerrado.');
  if(l.renewals>=s.settings.maxRenewals)throw new Error('Limite de renovações atingido.');
  if(s.reservations.some(r=>r.bookId===l.bookId))throw new Error('Há leitores na fila. A renovação não está disponível.');
  if(dayDiff(l.expectedReturnDate)<0)throw new Error('Regularize a devolução em atraso antes de um novo empréstimo.');
  l.expectedReturnDate=addDays(l.expectedReturnDate,s.settings.defaultLoanDays);l.renewals++;label=`Renovação: ${get('books',l.bookId).title}`;
 }else if(action.type==='progress'){
  const l=get('loans',action.id);if(role!=='admin'&&l.employeeId!==mine?.id)throw new Error('Você só pode atualizar sua própria leitura.');if(l.actualReturnDate)throw new Error('Esta leitura já foi encerrada.');l.progress=z.coerce.number().int().min(0).max(100).parse(action.progress);label='Progresso de leitura atualizado';
 }else if(action.type==='reserve'){
  const employeeId=role==='admin'?action.employeeId:mine?.id;const b=requireBook(action.bookId);const e=requireEmployee(employeeId);
  if(s.reservations.some(r=>r.bookId===b.id&&r.employeeId===e.id)||s.loans.some(l=>l.bookId===b.id&&l.employeeId===e.id&&!l.actualReturnDate))throw new Error('O leitor já tem uma reserva ou empréstimo deste título.');
  s.reservations.push({id:crypto.randomUUID(),bookId:b.id,employeeId:e.id,createdAt:new Date().toISOString()});label=`Reserva: ${b.title}`;
 }else if(action.type==='cancelReservation'){
  const r=get('reservations',action.id);if(role!=='admin'&&r.employeeId!==mine?.id)throw new Error('Você só pode cancelar suas reservas.');s.reservations=s.reservations.filter(x=>x.id!==r.id);label='Reserva cancelada';
 }else if(action.type==='archiveBook'){
  admin();const b=get('books',action.id);if(s.loans.some(l=>l.bookId===b.id&&!l.actualReturnDate)||s.reservations.some(r=>r.bookId===b.id))throw new Error('Encerre os empréstimos e as reservas antes de arquivar.');b.archived=!b.archived;label=`${b.archived?'Arquivado':'Restaurado'}: ${b.title}`;
 }else if(action.type==='vote'){
  const r=get('suggestions',action.id);const key=actor.id;r.voters=r.voters.includes(key)?r.voters.filter((v:string)=>v!==key):[...r.voters,key];label='Voto atualizado';
 }else if(action.type==='purchaseSuggestion'){
  admin();const r=get('suggestions',action.id);if(r.status==='purchased')throw new Error('Esta sugestão já está em aquisições.');r.status='purchased';s.acquisitions.push(schemas.acquisitions.parse({id:crypto.randomUUID(),title:r.title,author:r.author,notes:'Origem: sugestão da equipe'}));label=`Aquisição iniciada: ${r.title}`;
 }else if(action.type==='arrive'){
  admin();const a=get('acquisitions',action.id);if(a.status==='arrived')throw new Error('Esta aquisição já foi recebida.');a.status='arrived';
  const existing=s.books.find(b=>!b.archived&&normalize(b.title)===normalize(a.title)&&normalize(b.author)===normalize(a.author));
  if(existing)existing.totalCopies+=a.totalCopies;else s.books.push(schemas.books.parse({id:crypto.randomUUID(),title:a.title,author:a.author,category:a.category,totalCopies:a.totalCopies,coverUrl:a.coverUrl,createdAt:new Date().toISOString()}));label=`Recebido no acervo: ${a.title}`;
 }else if(action.type==='attend'){
  const e=get('events',action.id);if(e.date<today())throw new Error('Este encontro já aconteceu.');const key=actor.id;e.attendees=e.attendees.includes(key)?e.attendees.filter((v:string)=>v!==key):[...e.attendees,key];label='Participação no encontro atualizada';
 }else if(action.type==='delete'){
  admin();if(!['events','suggestions','acquisitions'].includes(action.collection))throw new Error('Use o arquivamento para preservar o histórico.');const col=action.collection as Collection;const r=get(col,action.id);if(col==='acquisitions'&&r.status==='arrived')throw new Error('O histórico de recebimentos deve ser preservado.');s[col]=s[col].filter(x=>x.id!==r.id);label=`Removido: ${r.title}`;
 }else if(action.type==='settings') {admin();s.settings=settingsSchema.parse(action.settings);label='Políticas da biblioteca atualizadas';
 }else if(action.type==='import'){
  admin();const data=action.data;if(!data||typeof data!=='object')throw new Error('Arquivo inválido.');let count=0;if(collections.filter(c=>c!=='activity').reduce((n:number,c)=>n+(Array.isArray(data[c])?data[c].length:0),0)>500)throw new Error('Divida a importação em arquivos com até 500 registros no total.');
  for(const col of collections.filter(c=>c!=='activity')){
   if(data[col]===undefined)continue;if(!Array.isArray(data[col])||data[col].length>300)throw new Error('Importe até 300 registros por módulo em cada arquivo.');
   for(const raw of data[col]){
    const mapped={...raw,id:raw.id||crypto.randomUUID()};
    if(col==='books'){mapped.totalCopies=raw.totalCopies??raw.copies??1;mapped.category=raw.category||raw.area||'Outros';}
    if(col==='employees'){mapped.role='reader';mapped.email=raw.email||'';}
    if(col==='loans'){mapped.actualReturnDate=raw.actualReturnDate||'';mapped.completed=raw.completed??false;}
    if(col==='reservations')mapped.createdAt=raw.createdAt||new Date().toISOString();
    if(col==='suggestions')mapped.voters=[];
    const item=schemas[col].parse(mapped);
    if(s[col].some(x=>x.id===item.id))continue;
    if(col==='books'&&s.books.some(b=>normalize(b.title)===normalize(item.title)&&normalize(b.author)===normalize(item.author)))throw new Error(`Título duplicado com outro identificador: ${item.title}. Revise o arquivo.`);
    if(col==='employees'&&item.email&&s.employees.some(e=>e.email.toLowerCase()===item.email.toLowerCase()))throw new Error(`E-mail duplicado: ${item.email}. Revise o arquivo.`);
    s[col].push(item);count++;
   }
  }
  for(const l of s.loans){if(!s.books.some(b=>b.id===l.bookId)||!s.employees.some(e=>e.id===l.employeeId))throw new Error('Há empréstimos sem livro ou colaborador correspondente. Importe os cadastros junto com o histórico.');if(l.expectedReturnDate<l.checkoutDate||l.checkoutDate>today()||(l.actualReturnDate&&(l.actualReturnDate<l.checkoutDate||l.actualReturnDate>today())))throw new Error('Há datas inválidas no histórico de empréstimos.');}
  for(const l of s.loans.filter(x=>!x.actualReturnDate)){const b=requireBook(l.bookId);requireEmployee(l.employeeId);if(s.loans.filter(x=>!x.actualReturnDate&&x.bookId===l.bookId&&x.employeeId===l.employeeId).length>1)throw new Error('Há empréstimos ativos duplicados para o mesmo leitor e título.');}
  for(const b of s.books)if(s.loans.filter(l=>l.bookId===b.id&&!l.actualReturnDate).length>b.totalCopies)throw new Error(`Exemplares insuficientes para os empréstimos de ${b.title}.`);
  for(const r of s.reservations){requireBook(r.bookId);requireEmployee(r.employeeId);if(s.reservations.filter(x=>x.bookId===r.bookId&&x.employeeId===r.employeeId).length>1)throw new Error('Há reservas duplicadas no arquivo.');}
  for(const e of s.events)if(e.bookId&&!s.books.some(b=>b.id===e.bookId))throw new Error('Encontro com referência a livro inexistente.');
  label=`Importação: ${count} registros adicionados`;
 }else throw new Error('Ação desconhecida.');
 s.activity.unshift({id:crypto.randomUUID(),message:label,actor:actor.name||actor.email||'Administração',at:new Date().toISOString()});s.activity=s.activity.slice(0,1000);s.revision++;return s;
}
export function parseCSV(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;const clean=text.replace(/^\uFEFF/,'');const first=clean.split(/\r?\n/)[0]||'';const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 for(let i=0;i<clean.length;i++){const c=clean[i];if(c==='"'){if(quoted&&clean[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&clean[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw new Error('CSV com aspas não fechadas.');row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function importCSV(text:string,col:'books'|'employees'){
 const rows=parseCSV(text);if(rows.length<2)throw new Error('O CSV precisa de cabeçalho e ao menos um registro.');
 const aliases:Record<string,string>={titulo:'title',autor:'author',categoria:'category',exemplares:'totalCopies',copies:'totalCopies',disponiveis:'ignore',nome:'name',email:'email','e-mail':'email',setor:'department',departamento:'department',isbn:'isbn',paginas:'pages',localizacao:'location',descricao:'description',id:'id'};
 const keys=rows[0].map(k=>aliases[normalize(k).trim()]||k.trim());if(!keys.includes(col==='books'?'title':'name'))throw new Error(col==='books'?'Inclua a coluna Título.':'Inclua a coluna Nome.');
 return {[col]:rows.slice(1).map(row=>Object.fromEntries(keys.map((key,i)=>[key,row[i]||''])))};
}
export const csvCell=(value:any)=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
