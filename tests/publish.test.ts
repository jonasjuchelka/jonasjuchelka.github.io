import {test} from "node:test";
import assert from "node:assert/strict";
import {checkContent,checkMeta,extOf,metaJson,metaSchema,slugify,validSlug,UploadError,MAX_UPLOAD_BYTES} from "../artifacts/private-dashboard/src/server/publish-core";

const bytes=(...b:number[])=>new Uint8Array(b);
const throwsStatus=(fn:()=>unknown,status:number)=>assert.throws(fn,(e:unknown)=>e instanceof UploadError&&e.status===status);

test("nur docx, doc und md; Pfade im Namen zählen nicht",()=>{
  assert.equal(extOf("Mein Essay.DOCX"),"docx"); assert.equal(extOf("../../x.md"),"md");
  for(const n of ["a.exe","a.html","a.docx.exe","a","a.pdf"]) throwsStatus(()=>extOf(n),400);
});
test("Inhalt muss zur Endung passen (umbenannte Dateien fallen auf)",()=>{
  checkContent("docx",bytes(0x50,0x4b,0x03,0x04,1)); checkContent("doc",bytes(0xd0,0xcf,0x11,0xe0,1)); checkContent("md",new TextEncoder().encode("# Hallo äöü"));
  throwsStatus(()=>checkContent("docx",bytes(0x4d,0x5a,0x90,0)),400);      // EXE als .docx
  throwsStatus(()=>checkContent("doc",bytes(0x50,0x4b,0x03,0x04)),400);
  throwsStatus(()=>checkContent("md",bytes(0x50,0x4b,0,4)),400);           // Binärdaten als .md
  throwsStatus(()=>checkContent("md",bytes(0xff,0xfe,0x41)),400);          // kein UTF-8
  throwsStatus(()=>checkContent("md",new Uint8Array(0)),400);
  throwsStatus(()=>checkContent("md",new Uint8Array(MAX_UPLOAD_BYTES+1).fill(65)),413);
});
test("Gedanke: nur Text, höchstens 2000 Zeichen",()=>{
  const m=metaSchema.parse({kind:"gedanke",title:"x"});
  checkMeta(m,"md",new TextEncoder().encode("a".repeat(2000)));
  throwsStatus(()=>checkMeta(m,"md",new TextEncoder().encode("a".repeat(2001))),400);
  throwsStatus(()=>checkMeta(m,"docx",bytes(0x50,0x4b,3,4)),400);
});
test("Slug aus Titel ist sicher (keine Pfadteile) und gültig",()=>{
  assert.equal(slugify("Über Netzwerke & Größe!"),"uber-netzwerke-grosse");
  assert.equal(slugify("../../etc/passwd"),"etc-passwd");
  assert.ok(!validSlug("../x")&&!validSlug("A")&&!validSlug("a--b")&&!validSlug(""));
  assert.ok(slugify("x".repeat(200)).length<=60);
  assert.equal(slugify("???"),"");
});
test("Angaben: Titel Pflicht, Tags begrenzt, Gedanke ohne Tags in meta.json",()=>{
  assert.equal(metaSchema.safeParse({kind:"essay",title:"  "}).success,false);
  assert.equal(metaSchema.safeParse({kind:"essay",title:"a",tags:Array(9).fill("t")}).success,false);
  assert.equal(metaSchema.safeParse({kind:"video",title:"a"}).success,false);
  const g=JSON.parse(metaJson(metaSchema.parse({kind:"gedanke",title:"a",tags:["x"]}),"a","2026-11-15"));
  assert.deepEqual(g.tags,[]); assert.equal(g.slug,"a");
});
