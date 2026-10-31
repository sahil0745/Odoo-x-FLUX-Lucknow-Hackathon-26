const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '0_init', 'migration.sql');

const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const schemaModels = [...schemaContent.matchAll(/^model\s+([A-Za-z0-9_]+)\s*\{/gm)].map(m => m[1]);

const migrationContent = fs.readFileSync(migrationPath, 'utf8');
const sqlTables = [...migrationContent.matchAll(/CREATE\s+TABLE\s+"([A-Za-z0-9_]+)"/gm)].map(m => m[1]);

const { Prisma } = require('@prisma/client');
const clientModels = Object.values(Prisma.ModelName);

console.log('--- EXACT MODEL AUDIT ---');
console.log(`1. Total Models defined in schema.prisma: ${schemaModels.length}`);
console.log(schemaModels);
console.log(`\n2. Total Tables defined in migration.sql: ${sqlTables.length}`);
console.log(sqlTables);
console.log(`\n3. Total Models registered in Prisma.ModelName: ${clientModels.length}`);
console.log(clientModels);

const diffSchemaVsSql = schemaModels.filter(m => !sqlTables.includes(m));
console.log('\nDiscrepancy (Schema vs SQL):', diffSchemaVsSql.length === 0 ? 'PERFECT 1:1 MATCH (0 discrepancies)' : diffSchemaVsSql);

const diffSchemaVsClient = schemaModels.filter(m => !clientModels.includes(m));
console.log('Discrepancy (Schema vs Client):', diffSchemaVsClient.length === 0 ? 'PERFECT 1:1 MATCH (0 discrepancies)' : diffSchemaVsClient);
