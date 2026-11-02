import {test} from "node:test";
import assert from "node:assert/strict";
import {accessView,totpView} from "../artifacts/private-dashboard/src/server/access-view";
import {parseTotp} from "../artifacts/private-dashboard/src/server/crypto";

// The 2FA secret in every format we accept: plain Base32, Base32 with spaces, otpauth:// URI.
const SECRET="JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const FORMS=[SECRET,"jbsw y3dp ehpk 3pxp jbsw y3dp ehpk 3pxp",`otpauth://totp/Tool:jonas?secret=${SECRET}&issuer=Tool&algorithm=SHA256&digits=8&period=60`];
const login=(totp:string)=>({email:"team@example.test",username:"team",password:"pw-123",totp,website:"https://tool.example.test/login"});
const link={tool_name:"Tool",logo_url:null,tool_url:"https://tool.example.test",expires_at:"2026-11-02T12:00:00Z"};

/** Every string a client could see, lowercased, so the secret cannot hide in another case or encoding. */
function exposed(payload:unknown){
  const json=JSON.stringify(payload);
  return [json,json.toLowerCase(),json.replace(/\s/g,"")];
}
function secretVariants(input:string){
  const raw=parseTotp(input).secret; // the decoded key bytes
  return [SECRET,SECRET.toLowerCase(),input,raw.toString("hex"),raw.toString("base64"),raw.toString("base64url"),raw.toString("latin1")]
    .filter((v)=>v.length>=8);
}

test("friends get the current 2FA code, never the secret behind it",()=>{
  for(const f of FORMS){
    const view=accessView(login(f),link,3,Date.UTC(2026,10,2,10,0,0));
    assert.ok(view.totp,"code is there");
    assert.deepEqual(Object.keys(view.totp!).sort(),["code","period","remaining"],"only code, period and seconds left");
    assert.match(view.totp!.code,/^\d{6,8}$/);
    for(const text of exposed(view)) for(const v of secretVariants(f)) assert.ok(!text.includes(v),`secret leaked as ${JSON.stringify(v).slice(0,20)}…`);
  }
});

test("the 2FA refresh (every 30 s) also returns only the code",()=>{
  for(const f of FORMS){
    const view={totp:totpView(login(f))};
    assert.deepEqual(Object.keys(view),["totp"]);
    assert.deepEqual(Object.keys(view.totp!).sort(),["code","period","remaining"]);
    for(const text of exposed(view)) for(const v of secretVariants(f)) assert.ok(!text.includes(v));
  }
});

test("payload has exactly the expected fields, nothing extra from the stored login",()=>{
  const view=accessView(login(SECRET),link,1);
  assert.deepEqual(Object.keys(view).sort(),["email","expires_at","password","tool","totp","username","views"]);
  assert.deepEqual(Object.keys(view.tool).sort(),["logo_url","name","url"]);
});

test("no 2FA configured means no code",()=>{
  assert.equal(totpView(login("")),null);
  assert.equal(accessView(login(""),link,0).totp,null);
});
