import {publications} from './content-model.mjs';
export const ZONE='America/Santo_Domingo';
export const DAY=86400000;
export const dateKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export const shiftDate=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*DAY).toISOString().slice(0,10);
export const stamp=value=>Date.parse(value+(value.length===10?'T00:00':'')+':00-04:00');
export const local=value=>new Date(value-4*3600000).toISOString().slice(0,16);
export const minutes=value=>Number(value.slice(11,13))*60+Number(value.slice(14,16));
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function validLocal(value){return /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)&&validDate(value.slice(0,10));}
export function validateAgenda(r){
 if(!String(r.name||'').trim())throw Error('El título es obligatorio.');
 if(!['task','activity'].includes(r.recordType))throw Error('Selecciona un tipo válido.');
 if(!['pendiente','en curso','completada','cancelada'].includes(r.status))throw Error('Selecciona un estado válido.');
 if(!['alta','media','baja','normal'].includes(r.priority||'media'))throw Error('Selecciona una prioridad válida.');
 if(r.date&&!validDate(r.date))throw Error('Revisa la fecha límite.');
 if(r.recordType==='activity'&&(!r.start||!r.end))throw Error('Indica el inicio y la finalización.');
 if(Boolean(r.start)!==Boolean(r.end))throw Error('Completa el inicio y la finalización del horario.');
 if(r.start&&(!validLocal(r.start)||!validLocal(r.end)||stamp(r.end)<=stamp(r.start)))throw Error('La finalización debe ser posterior al inicio.');
 if(r.start&&[r.start,r.end].some(v=>Number(v.slice(14,16))%15))throw Error('Utiliza intervalos de 15 minutos (:00, :15, :30 o :45).');
 if(!['','0','5','15','30','60','1440'].includes(String(r.reminder??'')))throw Error('Selecciona un recordatorio válido.');
 if(r.reminder!==''&&r.reminder!=null&&!r.start&&!r.date)throw Error('Añade una fecha o un horario para el recordatorio.');
 if(r.link&&!/^https?:\/\//i.test(r.link))throw Error('El enlace debe comenzar por https:// o http://.');
 return r;
}
export function taskRows(s){return Object.values(s.records).filter(r=>r.kind==='tasks'&&r.recordType!=='activity'&&!r.archived&&!r.deleted).map(r=>({...r,priority:r.priority==='normal'?'media':r.priority||'media'}));}
export function agendaEvents(s){
 const rows=Object.values(s.records).filter(r=>!r.archived&&!r.deleted),result=[];
 for(const r of rows){
 if(r.kind==='tasks'){
 const type=r.recordType==='activity'?'activity':'task',start=r.start||'',end=r.end||'';
 if(start)result.push({key:r.id,id:r.id,name:r.name,type,status:r.status||'pendiente',start,end,date:start.slice(0,10),timed:true,href:'#tasks/'+r.id});
 else if(r.date&&type==='task')result.push({key:r.id,id:r.id,name:r.name,type,status:r.status||'pendiente',date:r.date,timed:false,href:'#tasks/'+r.id});
 }else if(r.kind==='orders'&&r.due&&!['entregado','cancelado'].includes(r.status)){
 const start=r.deliveryStart?r.due+'T'+r.deliveryStart.slice(11):'',end=start?local(stamp(start)+(stamp(r.deliveryEnd)-stamp(r.deliveryStart))):'';result.push({key:r.id,id:r.id,name:'Entrega · '+(r.number||r.name),type:'order',status:'pendiente',date:r.due,start,end,timed:Boolean(start),href:'#tasks/link/'+r.id});
 }else if(r.kind==='content')for(const p of publications(r).filter(p=>p.date&&p.status!=='publicado')){
 const start=p.time?p.date+'T'+p.time:'';
 result.push({key:r.id+'~'+p.id,id:r.id,publicationId:p.id,name:r.name+' · '+p.platform,type:'content',status:'pendiente',date:p.date,start,end:p.end||(start?local(stamp(start)+30*60000):''),timed:Boolean(start),href:'#tasks/link/'+r.id+'~'+p.id});
 }
 }
 return result;
}
export function filterAgenda(rows,{query='',type='',status='active'}={}){const q=query.trim().toLocaleLowerCase('es');return rows.filter(r=>(!q||r.name.toLocaleLowerCase('es').includes(q))&&(!type||r.type===type)&&(status==='all'||(status==='active'?!['completada','cancelada'].includes(r.status):r.status===status)));}
// Assign overlapping segments to lanes within each connected overlap group.
export function eventSegments(rows,date){const lower=stamp(date+'T00:00'),upper=lower+DAY;const items=rows.filter(e=>e.timed&&stamp(e.start)<upper&&stamp(e.end)>lower).map(e=>({...e,top:Math.max(0,(stamp(e.start)-lower)/60000),bottom:Math.min(1440,(stamp(e.end)-lower)/60000)})).sort((a,b)=>a.top-b.top||b.bottom-a.bottom);let group=[],end=-1;const finish=()=>{let lanes=[];for(const e of group){let lane=lanes.findIndex(n=>n<=e.top);if(lane<0)lane=lanes.length;lanes[lane]=e.bottom;e.lane=lane;}for(const e of group)e.lanes=lanes.length;group=[];};for(const e of items){if(e.top>=end){finish();end=-1;}group.push(e);end=Math.max(end,e.bottom);}finish();return items;}
export function agendaMutation(s,cmd,{put,at,id,nextDate}){
 const find=()=>{const r=s.records[cmd.id];if(!r||r.deleted)throw Error('No se encontró el registro.');if(cmd.expectedAt&&r.updatedAt!==cmd.expectedAt)throw Error('El registro cambió después. Revisa su detalle antes de deshacer.');return r;};
 const write=(r,data)=>put({...r,...data,timezone:ZONE,origin:r.origin||'hub',updatedAt:at});
 if(cmd.action==='agenda-preferences'){const d=cmd.data;if(!['12','24'].includes(d.format)||!Number.isInteger(Number(d.scrollHour))||Number(d.scrollHour)<0||Number(d.scrollHour)>23)throw Error('Revisa las opciones del calendario.');s.settings.agenda={format:d.format,scrollHour:Number(d.scrollHour)};return null;}
 if(cmd.action==='agenda-save'){
 const old=cmd.id?find():null;if(old&&old.kind!=='tasks')throw Error('El registro no es una actividad o tarea.');
 const r=validateAgenda({...old,...cmd.data,kind:'tasks',recordType:cmd.data.recordType||old?.recordType||'task'});
 if(r.relatedId&&(!s.records[r.relatedId]||s.records[r.relatedId].deleted))throw Error('Selecciona un registro relacionado válido.');
 if(old?.repeat&&old.repeat!=='ninguna'&&r.status==='completada'&&old.status!=='completada')put({...old,id:id+'-next',status:'pendiente',date:nextDate(old.date,old.repeat),createdAt:at,updatedAt:at,timezone:ZONE,origin:'hub'});
 return write(old||{id,createdAt:at},r);
 }
 if(cmd.action==='agenda-delete'){const r=find();if(r.kind!=='tasks')throw Error('Gestiona este registro desde su sección original.');return write(r,{deleted:true});}
 if(cmd.action==='agenda-state'){const r=find();if(r.kind!=='tasks'||r.recordType==='activity')throw Error('Selecciona una tarea.');return agendaMutation(s,{action:'agenda-save',id:r.id,data:{status:cmd.status,recordType:'task'}},{put,at,id,nextDate});}
 if(cmd.action==='agenda-schedule'){
 const r=find(),d=cmd.data||{};if(Boolean(d.start)!==Boolean(d.end))throw Error('Completa el inicio y la finalización.');if(['orders','content'].includes(r.kind)&&!d.start&&!validDate(d.date))throw Error('Indica una fecha válida.');if(d.start&&(!validLocal(d.start)||!validLocal(d.end)||stamp(d.end)<=stamp(d.start)||[d.start,d.end].some(v=>Number(v.slice(14,16))%15)))throw Error('Revisa el horario y utiliza intervalos de 15 minutos.');
 if(d.date&&!validDate(d.date))throw Error('Revisa la fecha.');
 if(r.kind==='tasks')return agendaMutation(s,{action:'agenda-save',id:r.id,data:{...d,...(d.start&&r.recordType!=='activity'?{date:r.date||''}:{}),recordType:r.recordType||'task'}},{put,at,id,nextDate});
 if(r.kind==='orders'){if(['entregado','cancelado'].includes(r.status))throw Error('El pedido ya no está pendiente de entrega.');return write(r,{due:d.start?d.start.slice(0,10):d.date,deliveryStart:d.start||'',deliveryEnd:d.end||''});}
 if(r.kind==='content'){
 const ps=publications(r).map(p=>({...p})),p=ps.find(p=>p.id===cmd.publicationId);if(!p||p.status==='publicado')throw Error('Esta publicación ya no está pendiente.');
 p.date=d.start?d.start.slice(0,10):d.date;p.time=d.start?d.start.slice(11,16):'';p.end=d.end||'';return write(r,{publications:ps});
 }
 throw Error('Este registro no permite cambiar su fecha desde Agenda.');
 }
 throw Error('Acción de Agenda no válida.');
}
