import {test} from "node:test";
import assert from "node:assert/strict";
import {authConfig,checkOrigin,safeExternalUrl} from "../artifacts/private-dashboard/src/server/policy";
test("configuration fails closed",()=>{delete process.env.AUTH_ENVIRONMENT; assert.throws(()=>authConfig());});
test("production does not accept preview or shared RP domains",()=>{
  process.env.AUTH_ENVIRONMENT="production";
  for(const origin of ["https://example.replit.dev","https://replit.app","https://github.io","http://example.com","https://example.com/path"]) {
    process.env.PRIVATE_APP_ORIGIN=origin; assert.throws(()=>authConfig());
  }
});
test("exact HTTPS origin determines RP ID",()=>{
  process.env.PRIVATE_APP_ORIGIN="https://private.example.com";
  assert.deepEqual(authConfig(),{origin:"https://private.example.com",rpID:"private.example.com"});
});
test("CSRF rejects absent, foreign and prefix-matching origins",()=>{
  for(const origin of [null,"https://evil.example","https://private.example.com.evil.example"]) assert.throws(()=>checkOrigin(origin,"https://private.example.com"));
  assert.doesNotThrow(()=>checkOrigin("https://private.example.com","https://private.example.com"));
});
test("external links reject script, data, HTTP and credentials",()=>{
  for(const url of ["javascript:alert(1)","data:text/html,a","http://example.com","https://user:pass@example.com"]) assert.throws(()=>safeExternalUrl(url));
  assert.equal(safeExternalUrl("https://example.com"),"https://example.com/");
});
