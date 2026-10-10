export const stages=['idea','en preparación','listo'];
export const platforms=['Instagram','Facebook','TikTok','YouTube','Pinterest','Otra'];
export const statusLabel=value=>({'idea':'Idea','en preparación':'En preparación','listo':'Listo','parcial':'Publicación parcial','publicado':'Publicado'})[value]||value;
export function publications(record){
 if(Array.isArray(record.publications))return record.publications;
 if(!record.channel&&!record.date&&record.status!=='publicado')return [];
 return [{id:'legacy',platform:record.channel||'Sin especificar',text:record.copy||'',date:record.date||'',time:record.time||'',status:record.status==='publicado'?'publicado':'pendiente',actualDate:record.status==='publicado'?record.date||'':'',url:''}];
}
export function contentStatus(record){const rows=publications(record);if(rows.length&&rows.every(p=>p.status==='publicado'))return 'publicado';if(rows.some(p=>p.status==='publicado'))return 'parcial';return stages.includes(record.stage)?record.stage:stages.includes(record.status)?record.status:record.status==='programado'?'listo':'idea';}
export function nextPublication(record){const rows=publications(record);if(rows.length&&rows.every(p=>p.status==='publicado'))return {label:'Completado',date:''};const next=rows.filter(p=>p.status!=='publicado'&&p.date).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0];return next?{...next,label:`${next.date}${next.time?' · '+next.time:''}`}:{label:'Sin fecha',date:''};}
export function contentEvents(records){return records.filter(r=>r.kind==='content'&&!r.archived).flatMap(r=>publications(r).filter(p=>p.date).map(p=>({...r,eventDate:p.date,time:p.time||'',publicationId:p.id,publicationStatus:p.status,platform:p.platform,name:`${r.name} · ${p.platform}`,href:`#content/${r.id}/publication-${p.id}`})));}
export function filterContent(records,{query='',status='',platform=''}={}){const q=query.trim().toLocaleLowerCase('es');return records.filter(r=>r.kind==='content'&&(status==='archived'?r.archived:!r.archived)&&(!status||status==='archived'||contentStatus(r)===status)&&(!platform||publications(r).some(p=>p.platform===platform))&&(!q||[r.name,r.topic,r.idea,r.script,r.copy,r.notes,...publications(r).map(p=>p.text)].some(v=>String(v||'').toLocaleLowerCase('es').includes(q))));}
export function validateContent(record){
 if(!Array.isArray(record.publications))return record;
 if(!stages.includes(record.stage))throw Error('Selecciona una etapa de preparación válida.');
 const ids=new Set();for(const p of record.publications){
  if(!p.id||ids.has(p.id))throw Error('Cada publicación debe tener un identificador único.');ids.add(p.id);
  if(!String(p.platform||'').trim())throw Error('Selecciona la plataforma de cada publicación.');
  if(!['pendiente','publicado'].includes(p.status))throw Error('Selecciona un estado de publicación válido.');
  for(const key of ['date','actualDate'])if(p[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(p[key])||new Date(p[key]+'T12:00:00Z').toISOString().slice(0,10)!==p[key]))throw Error('Revisa las fechas de publicación.');
  if(p.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))throw Error('Revisa la hora prevista.');
  if(p.status==='publicado'&&!p.actualDate)throw Error('Indica la fecha real de cada publicación completada.');
  if(p.url&&!/^https?:\/\//i.test(p.url))throw Error('El enlace publicado debe comenzar con https:// o http://.');
 }
 record.status=contentStatus(record);return record;
}
export function contentCsv(rows){const cell=v=>'"'+String(v??'').replace(/^[=+\-@\t\r]/,"'$&").replaceAll('"','""')+'"';return new Blob(['\ufeff'+[['Contenido','Formato','Plataformas','Estado','Próxima publicación'],...rows.map(r=>[r.name,r.format,publications(r).map(p=>p.platform).join(' · '),statusLabel(contentStatus(r)),nextPublication(r).label])].map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});}
