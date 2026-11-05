export function materialCostKnown(material){return Boolean(material&&!material.deleted&&(material.costKnown===true||material.referencePurchaseId||Number(material.unitCost)>0));}
export function catalogCostOf(records,product){
 let materialCost=0,missing=[];
 for(const line of product.recipe||[]){const material=records[line.materialId];if(!materialCostKnown(material))missing.push(material?.name||line.description||'Material');else materialCost+=Number(line.quantity||0)*Number(material.unitCost||0);}
 const laborCost=(product.labor||[]).reduce((sum,t)=>sum+Number(t.hours||0)*Number(t.rate||0),0),advertising=(materialCost+laborCost)*Number(product.adPercent||0)/100,other=Number(product.otherCost||0),cost=materialCost+laborCost+advertising+other;
 if(!product.costConfigured&&!(product.recipe?.length||product.labor?.length||other))missing.push('Composición sin configurar');
 return {materialCost,laborCost,advertising,other,cost,suggested:cost*(1+Number(product.markup||0)/100),missing};
}
