import {list,totals,documentStatus,cashflow,today} from './domain.mjs';
import {confirmedSales} from './statistics.mjs';

// A replacement draft does not supersede a proposal that was already sent.
export function currentQuoteVersions(state){
 const families=new Map(),stamp=r=>Date.parse(r.issuedAt||r.updatedAt||r.createdAt||'')||0;
 for(const quote of list(state,'quotes',true)){
  const published=quote.status!=='borrador'&&(quote.issuedAt||['enviada','vencida','aprobada','rechazada'].includes(quote.status));
  if(!published)continue;
  const key=quote.rootId||quote.id,old=families.get(key),revision=Number(quote.revision)||1;
  if(!old||revision>(Number(old.revision)||1)||revision===(Number(old.revision)||1)&&stamp(quote)>stamp(old))families.set(key,quote);
 }
 return [...families.values()];
}
export function quoteMetrics(state,date=today()){
 const linked=new Set([...list(state,'orders',true),...list(state,'invoices',true)].map(r=>r.quoteId).filter(Boolean));
 const active=currentQuoteVersions(state).filter(r=>!r.archived&&(documentStatus(state,r,date)==='enviada'||r.status==='aprobada'&&!linked.has(r.id)));
 const pending=active.filter(r=>documentStatus(state,r,date)==='enviada');
 const end=new Date(date+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const limit=end.toISOString().slice(0,10);
 const expiring=pending.filter(r=>r.validUntil&&r.validUntil>=date&&r.validUntil<=limit);
 return {active,pending,expiring,quoted:active.reduce((sum,r)=>sum+totals(r).total,0)};
}
export function invoiceMetrics(state,date=today()){
 const from=date.slice(0,7)+'-01',flow=cashflow(state,from,date);
 const issued=confirmedSales(state).filter(r=>r.saleDate>=from&&r.saleDate<=date);
 const overdue=list(state,'invoices',true).filter(r=>documentStatus(state,r,date)==='vencida');
 // Count each actual cash movement once, including refunds and advances before invoicing.
 // Applying an old advance to a new invoice creates no new payment and adds no cash.
 const collections=flow.entries.filter(r=>['invoices','orders'].includes(r.origin)&&r.direction==='income');
 return {issued,overdue,receivable:flow.receivable,collections,collected:collections.reduce((sum,r)=>sum+r.signed,0)};
}
