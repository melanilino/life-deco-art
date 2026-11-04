const aliases={'en diseño':'diseño','esperando aprobación':'aprobación','en producción':'producción','listo para entregar':'listo'};
export const orderStageOf=record=>['borrador','cancelado','entregado'].includes(record.status)?record.status:aliases[record.stage]||record.stage||aliases[record.status]||record.status||'pendiente';
export const orderIsActive=record=>!record.archived&&!record.deleted&&!['borrador','cancelado','entregado'].includes(orderStageOf(record));
export const orderIsWaiting=record=>orderIsActive(record)&&(record.condition==='esperando cliente'||record.status==='esperando aprobación');
export const orderIsLate=(record,date)=>orderIsActive(record)&&Boolean(record.due&&record.due<date);
export function orderConditionOf(record,date){const stage=orderStageOf(record);if(['borrador','cancelado','entregado'].includes(stage))return stage;if(orderIsWaiting(record))return 'esperando cliente';if(orderIsLate(record,date))return 'atrasado';return stage==='listo'?'listo':'en proceso';}
export function orderProgressPatch(record,{stage,waiting,reopen=false},at){
 stage=aliases[stage]||stage;
 if(record.status==='borrador')throw Error('Completa el borrador desde Editar pedido antes de actualizar su avance.');
 if(record.status==='cancelado')throw Error('El pedido está cancelado y no admite cambios de etapa.');
 if(!['pendiente','diseño','aprobación','producción','listo','entregado','cancelado'].includes(stage))throw Error('Etapa no permitida.');
 if(orderStageOf(record)==='entregado'&&!['entregado','cancelado'].includes(stage)&&!reopen)throw Error('Confirma la reapertura del pedido entregado antes de cambiar su etapa.');
 return {status:stage,stage,condition:['entregado','cancelado'].includes(stage)?'':(waiting??orderIsWaiting(record))?'esperando cliente':'',deliveredAt:stage==='entregado'?(record.deliveredAt||at):null};
}
export function orderOverview(records,date){
 const active=records.filter(orderIsActive),end=new Date(date+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const until=end.toISOString().slice(0,10);
 return {active:active.length,upcoming:active.filter(r=>r.due&&r.due>=date&&r.due<=until).length,approval:active.filter(r=>orderStageOf(r)==='aprobación'||orderIsWaiting(r)).length,late:active.filter(r=>orderIsLate(r,date)).length};
}
