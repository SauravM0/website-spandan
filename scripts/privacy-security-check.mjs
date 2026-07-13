import fs from 'node:fs';
const register=JSON.parse(fs.readFileSync(new URL('../docs/privacy-security/register.json',import.meta.url),'utf8'));
const errors=[]; const required=['name','classification','owner','purpose','access','retention','encryption','sharing','deletion'];
if(register.schemaVersion!==1) errors.push('Unsupported privacy register schema.');
if(register.timezone!=='Asia/Kolkata') errors.push('Privacy program timezone must be Asia/Kolkata.');
if(!Array.isArray(register.dataClasses)||!register.dataClasses.length) errors.push('Data inventory is empty.');
for(const item of register.dataClasses||[]) for(const field of required) if(!(field in item)) errors.push(`${item.name||'<unnamed>'}: missing ${field}.`);
for(const vendor of register.vendors||[]) if(!vendor.name||!vendor.data||!vendor.status) errors.push('Vendor entries require name, data, and status.');
if(process.argv.includes('--production')) for(const [role,owner] of Object.entries(register.approvedOwners||{})) if(!owner) errors.push(`Production privacy/security owner unassigned: ${role}.`);
if(errors.length){console.error('Privacy/security check failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1);}
console.log(`Privacy/security register valid: ${register.dataClasses.length} data classes, ${register.vendors.length} vendors.`);
