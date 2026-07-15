import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export default function DataPage(){ const md=readFileSync(join(process.cwd(),'docs/legal/tus-datos-contenido.md'),'utf8'); return <main className="shell"><article className="card"><pre className="legal">{md}</pre></article></main>; }
