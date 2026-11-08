import test from 'node:test';
import assert from 'node:assert/strict';
import {homePeriods,homeSales,homeEventHref,homeGreeting} from '../panel/home-model.mjs';
import {emptyState} from '../panel/domain.mjs';

test('El saludo cambia a las 6, 12 y 18 según República Dominicana, incluso de madrugada',()=>{
 for(const [utc,expected] of [
  ['2026-11-07T09:59:59Z','Buenas noches'],
  ['2026-11-07T10:00:00Z','Buenos días'],
  ['2026-11-07T15:59:59Z','Buenos días'],
  ['2026-11-07T16:00:00Z','Buenas tardes'],
  ['2026-11-07T21:59:59Z','Buenas tardes'],
  ['2026-11-07T22:00:00Z','Buenas noches'],
  ['2026-11-08T04:00:00Z','Buenas noches']
 ])assert.equal(homeGreeting(new Date(utc)),expected);
 assert.equal(homeGreeting(new Date('2026-11-07T16:00:00Z'),'UTC'),'Buenas tardes');
 assert.equal(homeGreeting(new Date('2026-11-07T10:00:00Z'),'Zona inválida'),'Buenos días');
});
test('Inicio compara el mismo tramo y evita porcentajes sin días equivalentes',()=>{assert.deepEqual(homePeriods('2026-10-15'),{from:'2026-10-01',to:'2026-10-15',previousFrom:'2026-09-01',previousTo:'2026-09-15',comparable:true});assert.equal(homePeriods('2026-03-31').comparable,false);assert.equal(homePeriods('2026-03-31').previousTo,'2026-02-28');assert.equal(homePeriods('2026-01-02').previousFrom,'2025-12-01');});
test('Ventas usa fecha comercial y excluye borradores, anuladas y fechas futuras',()=>{const s=emptyState();for(const [id,date,status]of [['a','2026-10-01','emitida'],['b','2026-10-01','borrador'],['c','2026-10-01','anulada'],['d','2026-10-30','emitida']])s.records[id]={id,kind:'invoices',date,issuedAt:'2026-09-30',status,lines:[{quantity:1,price:100}]};assert.equal(homeSales(s,'2026-10-01','2026-10-15'),10000);});
test('Compromisos preserva publicación concreta y editor de agenda',()=>{assert.equal(homeEventHref({kind:'content',id:'a',href:'#content/a/publication-b'}),'#content/a/publication-b');assert.equal(homeEventHref({kind:'orders',id:'a',href:'#tasks/link/a'}),'#tasks/link/a');assert.equal(homeEventHref({kind:'accounts',id:'a'}),'#accounts/a');});
