import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const client=fs.readFileSync(new URL('../public/marriage-certificate.js',import.meta.url),'utf8');
const sandbox={window:{},TextEncoder,Blob};
vm.runInNewContext(client,sandbox,{timeout:1000});
const generator=sandbox.window.MasjidMarriageCertificate;

test('a marriage certificate generator provides A4 landscape PDF output',async()=>{
 assert.equal(typeof generator.buildPdf,'function');
 const jpeg=new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1,255,217]);
 const blob=generator.buildPdf(jpeg,1535,1024);
 assert.equal(blob.type,'application/pdf');
 const buf=Buffer.from(await blob.arrayBuffer()),output=buf.toString('latin1');
 assert.match(output,/^%PDF-1\.4/);
 assert.match(output,/MediaBox \[0 0 841\.89 595\.28\]/);
 assert.match(output,/\/Subtype \/Image \/Width 1535 \/Height 1024/);
 assert.match(output,/\/Filter \/DCTDecode \/Length 14/);
 assert.ok(buf.includes(jpeg),'PDF contains the original JPEG image stream');
 const match=output.match(/startxref\n(\d+)\n%%EOF$/);
 assert.ok(match,'PDF includes cross-reference offset');
 const offset=Number(match[1]);
 assert.equal(buf.subarray(offset,offset+4).toString(),'xref');
 const entries=output.slice(offset).match(/\b\d{10} 00000 n\b/g);
 assert.equal(entries?.length,5,'PDF references all five objects');
});

test('approved certificate and download controls are admin only in portal UI',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("['marriage','Marriage certificates','award']"));
 assert.ok(app.includes("case'marriage':content=marriagePage()"));
 assert.ok(app.includes("window.MasjidMarriageCertificate?.mount"));
 for(const field of ['groom','bride','nikahDate','mahr','issueDate'])
  assert.ok(app.includes("'"+field+"'"),'Missing required certificate field '+field);
 const certPage=app.slice(app.indexOf('function marriagePage()'),app.indexOf('function ',app.indexOf('function marriagePage()')+20));
 assert.ok(!certPage.includes("'witness1'")&&!certPage.includes("'witness2'"),
  'Certificate form must not request witness details');
 assert.ok(!client.includes('witness1')&&!client.includes('witness2'),
  'Witness details must not be rendered on the certificate');
 assert.ok(app.includes("userCan('admin')"),'Marriage page must be restricted to administrators');
 assert.ok(client.includes('Great Vibes'),'Groom and bride names should use calligraphic script');
 assert.ok(client.includes('ctx.drawImage(base,0,0,W,H)'),'Original approved bilingual template must be preserved');
 assert.match(client,/scriptName\(ctx,r\.groom,444,450,1438,487\)/);
 assert.match(client,/formal\(ctx,toUK\(r\.issueDate\),1278,790,215,18\)/);
 const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
 assert.ok(worker.includes('masjid_marriage_certificate_template_v2_no_witnesses'),
  'Use a versioned artwork key so old witness fields cannot remain visible');

});
