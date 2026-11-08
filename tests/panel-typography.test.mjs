import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const files=['panel.css','content.css','agenda.css','admin.css','clients-pilot.css','shared.css','typography.css'];
const source=await Promise.all(files.map(file=>readFile(new URL('../panel/'+file,import.meta.url),'utf8')));
const canonical=source.at(-1);

test('el Hub conserva la escala aprobada de seis tamaños de texto',()=>{
 const roles={'page-title':28,'panel-title':22,'section-title':18,'record-title':15,body:13,helper:12,meta:12,metric:22};
 for(const [name,size] of Object.entries(roles))assert.match(canonical,new RegExp(`--font-${name}:\\s*${size}px`));
 const allowed=new Set([12,13,15,18,22,28]);
 for(let i=0;i<source.length;i++)for(const rule of source[i].matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const selector=rule[1];
  for(const declaration of rule[2].matchAll(/font-size\s*:\s*([^;}]+)/g)){
   const value=declaration[1].trim();
   if(value.startsWith('var(--font-'))continue;
   // Símbolos de cierre/flechas y el logotipo tipográfico no son texto de interfaz.
   if(/brand-script|quick-notes-head(?:>|\s+)button|#client-form>header button|creation-panel-head button|quick-note-menu summary|sales-actions>summary|sales-row-open|sales-line-row button|attention-icon\.calm/.test(selector))continue;
   assert.ok(/^\d+px(?:!important)?$/.test(value)&&allowed.has(parseFloat(value)),`${files[i]}: ${selector.trim()} usa ${value}`);
  }
 }
});

test('la hoja canónica se carga al final, también después de los estilos de sección',async()=>{
 const html=await readFile(new URL('../panel.html',import.meta.url),'utf8');
 const sheets=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m=>m[1]);
 assert.match(sheets.at(-1),/^\/panel\/typography\.css\?/);
});
