import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const target='.sites-runtime/test-build';mkdirSync(target,{recursive:true});writeFileSync(target+'/package.json',JSON.stringify({type:'commonjs'}));
const compiled=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','tests/domain.test.ts','tests/transition.test.ts','lib/domain.ts','lib/persistence.ts','lib/auth-crypto.ts','lib/legacy-import.ts','--outDir',target,'--target','ES2022','--module','commonjs','--moduleResolution','node','--esModuleInterop','--strict','--skipLibCheck','--types','node'],{stdio:'inherit'});if(compiled.status)process.exit(compiled.status);
const tested=spawnSync(process.execPath,['--test',target+'/tests/domain.test.js',target+'/tests/transition.test.js'],{stdio:'inherit'});process.exit(tested.status||0);
