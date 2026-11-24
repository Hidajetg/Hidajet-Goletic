"use strict";
const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs"), vm=require("node:vm"), ts=require("typescript"), crypto=require("node:crypto");
const source=ts.transpileModule(fs.readFileSync("app/lib/native-push.ts","utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const {privateKey,publicKey}=crypto.generateKeyPairSync("rsa",{modulusLength:2048});
const env={SOLSTONE_FCM_SERVICE_ACCOUNT_BASE64:Buffer.from(JSON.stringify({
  project_id:"solstone-test-project",client_email:"push@solstone-test-project.iam.gserviceaccount.com",
  private_key:privateKey.export({format:"pem",type:"pkcs8"}),
})).toString("base64")};
function load(e,db,fetch){
  const exports={};
  vm.runInNewContext(source,{exports,require:m=>m==="node:crypto"?crypto:{supabaseAdmin:db},
    Buffer, URLSearchParams, AbortSignal, console, process:{env:e}, fetch});
  return exports;
}
test("missing and malformed FCM credentials fail closed",()=>{
  assert.equal(load({}, {},()=>{}).nativePushConfigured(),false);
  assert.equal(load({SOLSTONE_FCM_SERVICE_ACCOUNT_BASE64:"bad"},{},()=>{}).nativePushConfigured(),false);
  assert.equal(load(env,{},()=>{}).nativePushConfigured(),true);
});
test("bindings change with session and token; no raw session embedded",()=>{
  const p=load(env,{},()=>{});
  const a=p.deviceBinding("session-one","device-one");
  assert.match(a,/^[0-9a-f]{64}$/);
  assert.notEqual(a,p.deviceBinding("session-two","device-one"));
  assert.notEqual(a,p.deviceBinding("session-one","device-two"));
  assert.equal(a,p.deviceBinding("session-one","device-one"));
});
test("FCM receives only data-only minimal payload for active recipients",async()=>{
  const calls=[], db={from(table){
    if(table==="workers")return {select:()=>({eq:(key,value)=>{assert.equal(key,"active");assert.equal(value,true);return {in:async()=>({data:[{id:7}],error:null})};}})};
    assert.equal(table,"solstone_native_push_devices");
    return {select:()=>({in:(key,ids)=>{assert.equal(key,"worker_id");assert.equal(Array.from(ids).join(","),"7");return {gt:()=>({limit:async()=>({data:[{token:"device-token",binding:"a".repeat(64)}],error:null})})};}})};
  }};
  const p=load(env,db,async(url,opt)=>{
    calls.push({url,opt});
    if(url==="https://oauth2.googleapis.com/token"){
      const [h,c,s]=opt.body.get("assertion").split(".");
      assert.ok(crypto.verify("RSA-SHA256",Buffer.from(h+"."+c),publicKey,Buffer.from(s,"base64url")));
      return {ok:true,json:async()=>({access_token:"fake",expires_in:3600})};
    }
    return {ok:true};
  });
  await p.notifyNativeWorkers(["7","8"],"chat");
  assert.equal(calls.length,2);
  assert.equal(calls[1].url,"https://fcm.googleapis.com/v1/projects/solstone-test-project/messages:send");
  const m=JSON.parse(calls[1].opt.body).message;
  assert.equal(m.token,"device-token");
  assert.equal(m.notification,undefined);
  assert.deepEqual(Object.keys(m.data).sort(),["binding","expires","kind"]);
  assert.equal(m.data.kind,"chat");
  assert.equal(m.android.ttl,"120s");
  assert.equal(calls[1].opt.redirect,"error");
});
