import fs from 'node:fs';
const register=JSON.parse(fs.readFileSync(new URL('../docs/privacy-security/register.json',import.meta.url),'utf8'));
const errors=[]; const required=['name','classification','owner','purpose','access','retention','encryption','sharing','deletion'];
if(register.schemaVersion!==1) errors.push('Unsupported privacy register schema.');
if(register.timezone!=='Asia/Kolkata') errors.push('Privacy program timezone must be Asia/Kolkata.');
if(register.accountModel?.mode!=='single-administrator'||register.accountModel?.productionAccountCount!==1) errors.push('Privacy register must declare the approved single-administrator production account model.');
if(!Array.isArray(register.dataClasses)||!register.dataClasses.length) errors.push('Data inventory is empty.');
for(const item of register.dataClasses||[]) for(const field of required) if(!(field in item)) errors.push(`${item.name||'<unnamed>'}: missing ${field}.`);
for(const vendor of register.vendors||[]) if(!vendor.name||!vendor.data||!vendor.status) errors.push('Vendor entries require name, data, and status.');
if(process.argv.includes('--production')) {
  for(const [role,owner] of Object.entries(register.approvedOwners||{})) if(!owner) errors.push(`Production privacy/security owner unassigned: ${role}.`);
  for(const [review,gate] of Object.entries(register.externalReviewGates||{})) if(gate.required&&(!gate.approved||!gate.approver||!Array.isArray(gate.evidence)||!gate.evidence.length)) errors.push(`Required external privacy/security review is not approved with evidence: ${review}.`);
}
if(errors.length){console.error('Privacy/security check failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1);}
console.log(`Privacy/security register valid: ${register.dataClasses.length} data classes, ${register.vendors.length} vendors.`);
