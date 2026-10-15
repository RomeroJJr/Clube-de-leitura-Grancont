import { collections,type LibraryState } from './domain';
export type Statement = { sql:string;args:(string|number)[] };
export function writeStatements(prev:LibraryState,next:LibraryState,token:string):Statement[]{
 const statements:Statement[]=[{sql:'UPDATE library_meta SET revision=?,lock_token=?,settings=? WHERE id=? AND revision=?',args:[next.revision,token,JSON.stringify(next.settings),'grancont',prev.revision]}];
 for(const col of collections){const before=new Map(prev[col].map(r=>[r.id,JSON.stringify(r)]));const after=new Map(next[col].map(r=>[r.id,JSON.stringify(r)]));
  for(const [id,data] of after)if(before.get(id)!==data)statements.push({sql:'INSERT INTO library_records (collection,id,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data',args:[col,id,data,'grancont',token]});
  for(const id of before.keys())if(!after.has(id))statements.push({sql:'DELETE FROM library_records WHERE collection=? AND id=? AND EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)',args:[col,id,'grancont',token]});
 }return statements;
}
