import {validDate,shiftDate} from './agenda-model.mjs';
export const currencies=['DOP','USD','EUR','CAD','GBP','MXN'];
export const frequencies=['mensual','anual','trimestral','semestral','semanal','gratis','otro'];
export const moneyIn=(amount,currency='DOP')=>new Intl.NumberFormat('es-DO',{style:'currency',currency}).format(Number(amount)||0);
export const subscription=r=>({...r,usage:r.usage??r.category??'',plan:r.plan??r.subscription??'',currency:r.currency||'DOP',frequency:r.frequency||r.billing||'otro',knownCost:r.costConfigured??(r.cost!==undefined&&r.cost!==''&&r.cost!==null),cost:Number(r.cost)||0});
export function subscriptions(s){return Object.values(s.records).filter(r=>r.kind==='accounts'&&!r.archived&&!r.deleted).map(subscription);}
export function subscriptionMetrics(s,date){const active=subscriptions(s).filter(r=>r.status==='activo'),monthly={},upcoming={};let unknown=0;for(const r of active){const divisor={mensual:1,anual:12,trimestral:3,semestral:6,semanal:12/52,gratis:1}[r.frequency];if(r.knownCost&&r.renewal>=date&&r.renewal.slice(0,7)===date.slice(0,7)&&!(r.charges||[]).some(c=>c.period===r.renewal))upcoming[r.currency]=(upcoming[r.currency]||0)+r.cost;if(!r.knownCost||!divisor){unknown++;continue;}monthly[r.currency]=(monthly[r.currency]||0)+(r.frequency==='gratis'?0:r.cost/divisor);}
 return {active:active.length,monthly,upcoming,unknown,renewals:active.filter(r=>r.renewal>=date&&r.renewal<=shiftDate(date,30)).length};}
export const settingsGroups={business:['name','email','phone','address','logoResourceId'],costs:['hourly','hourlyConfigured'],preferences:['currency','timezone','dateFormat'],documents:['validDays','terms'],payments:['paymentMethods','paymentDetails','paymentInstructions']};
function amount(v){const n=Number(v);if(!Number.isFinite(n)||n<0||n>1e10)throw Error('Revisa el importe.');return n;}
function required(v,label){if(!String(v||'').trim())throw Error(label+' es obligatorio.');return String(v).trim();}
function date(v,label){if(!validDate(v))throw Error('Revisa '+label+'.');return v;}
function nextRenewal(period,frequency){const months={mensual:1,trimestral:3,semestral:6,anual:12}[frequency];if(frequency==='semanal')return shiftDate(period,7);if(!months)return '';const d=new Date(period+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return d.toISOString().slice(0,10);}
export function adminMutation(s,cmd,{put,at,id}){
 const write=(r,d)=>put({...r,...d,updatedAt:at});const find=()=>{const r=s.records[cmd.id];if(!r||r.kind!=='accounts')throw Error('No se encontró la suscripción.');return r;};
 if(cmd.action==='admin-settings'){
 const keys=settingsGroups[cmd.group];if(!keys)throw Error('Bloque no válido.');const d=Object.fromEntries(keys.filter(k=>Object.hasOwn(cmd.data,k)).map(k=>[k,cmd.data[k]]));
 if(cmd.group==='business'){d.name=required(d.name,'Nombre comercial');if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('Revisa el correo.');if(d.logoResourceId){const r=s.records[d.logoResourceId];if(r?.kind!=='resources'||!['image/png','image/jpeg'].includes(r.mime))throw Error('Selecciona un logotipo PNG o JPG.');}}
 if(cmd.group==='costs'){d.hourlyConfigured=d.hourly!==''&&d.hourly!==null;d.hourly=d.hourlyConfigured?amount(d.hourly):0;}
 if(cmd.group==='preferences'){if(d.currency!=='DOP'||d.timezone!=='America/Santo_Domingo'||!['DD/MM/AAAA','MM/DD/AAAA','AAAA-MM-DD'].includes(d.dateFormat))throw Error('Selecciona las preferencias disponibles.');}
 if(cmd.group==='documents'){d.validDays=amount(d.validDays);if(!Number.isInteger(d.validDays)||d.validDays>3650)throw Error('Revisa la vigencia de las cotizaciones.');}
 s.settings={...s.settings,...d};return null;
 }
 if(cmd.action==='admin-backup'){s.settings.lastBackup={at,type:cmd.data.type,records:cmd.data.records,files:cmd.data.files};return null;}
 if(cmd.action==='admin-subscription'){
 const old=cmd.id?find():null,d=cmd.data,name=required(d.name,'Plataforma');if(!currencies.includes(d.currency)||!frequencies.includes(d.frequency)||!['activo','prueba','pausado','cancelado'].includes(d.status))throw Error('Revisa moneda, frecuencia y estado.');if(d.renewal)date(d.renewal,'la renovación');for(const key of ['url','managerUrl'])if(d[key]&&!/^https?:\/\//i.test(d[key]))throw Error('Los enlaces deben comenzar por https:// o http://.');const days=amount(d.reminderDays||0);if(!Number.isInteger(days)||days>365)throw Error('Revisa el aviso previo.');const known=d.cost!==''&&d.cost!=null,cost=known?amount(d.cost):0;
 const data={name,usage:d.usage||'',plan:d.plan||'',subscription:d.plan||'',cost,costConfigured:known,currency:d.currency,frequency:d.frequency,billing:d.frequency,renewal:d.renewal||'',autoRenew:Boolean(d.autoRenew),reminderDays:days,username:d.username||'',url:d.url||'',managerUrl:d.managerUrl||'',notes:d.notes||'',status:d.status};
 const oldValue=old?subscription(old):null,history=[...(old?.planHistory||[])];if(!old||['plan','cost','currency','frequency','knownCost'].some(k=>oldValue[k]!==({...data,knownCost:known})[k])){if(old&&!history.length)history.push({at:old.updatedAt||old.createdAt||at,plan:oldValue.plan,cost:oldValue.cost,currency:oldValue.currency,frequency:oldValue.frequency,knownCost:oldValue.knownCost});history.push({at,plan:data.plan,cost,currency:d.currency,frequency:d.frequency,knownCost:known});}
 return write(old||{id,kind:'accounts',createdAt:at},{...data,planHistory:history});
 }
 if(cmd.action==='admin-charge'){
 const r=find(),sub=subscription(r),d=cmd.data;date(d.period,'el período cobrado');date(d.date,'la fecha del cobro');if((r.charges||[]).some(c=>c.period===d.period))throw Error('Este período ya tiene un cobro vinculado. Abre el gasto existente.');if(!['new','existing'].includes(d.mode))throw Error('Selecciona cómo vincular el gasto.');const sourceAmount=amount(d.amount);if(!sourceAmount)throw Error('El importe debe ser mayor que cero.');let dopAmount=Math.round(sourceAmount*100)/100,rate=1;if(sub.currency!=='DOP'){rate=amount(d.rate);if(!rate)throw Error('Indica la tasa de conversión a DOP.');date(d.rateDate,'la fecha de conversión');dopAmount=Math.round(sourceAmount*rate*100)/100;}const inCents=Math.round(dopAmount*100);if(!Number.isSafeInteger(inCents)||inCents<=0||dopAmount>1e12)throw Error('Revisa el importe convertido a DOP.');let expenseId;
 if(d.mode==='existing'){
 const e=s.records[d.expenseId];if(!e||e.kind!=='expenses'||e.recordType!=='finance-entry'||e.direction!=='expense'||e.subscriptionId||Math.round(Number(e.amount)*100)!==inCents)throw Error('Selecciona un gasto independiente pagado con el mismo importe en DOP.');const paid=Object.values(s.records).filter(p=>p.kind==='payments'&&p.target===e.id).reduce((sum,p)=>sum+(p.type==='refund'?-p.amount:p.amount),0);if(paid!==inCents)throw Error('El gasto elegido debe estar completamente pagado.');expenseId=e.id;write(e,{subscriptionId:r.id,subscriptionPeriod:d.period});
 }else{
 required(d.method,'Método de pago');expenseId=id+'-expense';put({id:expenseId,kind:'expenses',createdAt:at,updatedAt:at,name:r.name+' · '+d.period,category:'Suscripciones',amount:dopAmount,date:d.date,direction:'expense',recordType:'finance-entry',paymentState:'paid',person:r.name,notes:d.notes||'',status:'activo',subscriptionId:r.id,subscriptionPeriod:d.period});put({id:id+'-payment',kind:'payments',createdAt:at,updatedAt:at,name:r.name,target:expenseId,type:'payment',direction:'expense',amount:inCents,date:d.date,method:d.method});
 }
 const next=d.nextRenewal||nextRenewal(d.period,sub.frequency);if(next){date(next,'la próxima renovación');if(next<=d.period)throw Error('La próxima renovación debe ser posterior al período cobrado.');}
 return write(r,{charges:[...(r.charges||[]),{id,period:d.period,date:d.date,amount:sourceAmount,currency:sub.currency,rate,rateDate:sub.currency!=='DOP'?d.rateDate:'',dopAmount,expenseId,at}],renewal:next||r.renewal||''});
 }
 throw Error('Acción de Administración no válida.');
}
export function subscriptionCsv(rows){const cell=v=>'"'+String(v??'').replace(/^[=+\-@\t\r]/,"'$&").replaceAll('"','""')+'"';return new Blob(['\ufeff'+[['Plataforma','Uso','Plan','Importe','Moneda','Frecuencia','Próxima renovación','Estado'],...rows.map(r=>[r.name,r.usage,r.plan,r.knownCost?r.cost:'',r.currency,r.frequency,r.renewal,r.status])].map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});}
