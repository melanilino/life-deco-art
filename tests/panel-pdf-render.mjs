// Generates synthetic PDF evidence for local visual validation only.
import fs from 'node:fs/promises';import {documentPdf} from '../panel/pdf.mjs';
await fs.mkdir('.impeccable/review',{recursive:true});
const record={kind:'invoices',name:'Documento de prueba',number:'FAC-0001',status:'pendiente',date:'2026-09-08',issuer:{name:'Life Deco Art',email:'prueba@example.invalid',paymentInstructions:'Instrucciones de prueba, sin datos de pago reales.'},client:{name:'Cliente de prueba'},lines:[{description:'Concepto de prueba con acentos: diseño y caligrafía',quantity:2,price:200},{description:'Segundo concepto de prueba',quantity:1,price:100}],discountType:'percent',discount:10,shipping:50,terms:'Condiciones de prueba para verificar el documento. No representan condiciones comerciales de la marca.'};
await fs.writeFile('.impeccable/review/factura-prueba.pdf',new Uint8Array(await documentPdf(record,{paid:15000}).arrayBuffer()));
console.log('PDF sintético generado para verificación.');
