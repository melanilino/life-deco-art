import {confirmedSales} from './statistics.mjs';
export function homePeriods(date){
 const current=new Date(date+'T12:00:00Z'),day=current.getUTCDate();current.setUTCDate(1);
 const from=current.toISOString().slice(0,10);current.setUTCMonth(current.getUTCMonth()-1);
 const previousFrom=current.toISOString().slice(0,10),last=new Date(current);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);
 const comparable=day<=last.getUTCDate();current.setUTCDate(Math.min(day,last.getUTCDate()));
 return {from,to:date,previousFrom,previousTo:current.toISOString().slice(0,10),comparable};
}
export function homeSales(state,from,to){return confirmedSales(state).filter(r=>r.saleDate>=from&&r.saleDate<=to).reduce((sum,r)=>sum+r.amount,0);}
export function homeEventHref(r){return r.href||'#'+r.kind+'/'+r.id;}
