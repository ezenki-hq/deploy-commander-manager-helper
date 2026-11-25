import type { JSONValue, Wire } from "@ezenki/deploy-commander-installer-interface";
import type { ManagerInvocationDefinition, ManagerInvocationError, ManagerInvocationSession } from "./types.js";
import { requiredId } from "../input-validation.js";
function validJson(value: unknown, seen = new Set<object>()): value is JSONValue {
  if(value===null||typeof value==="string"||typeof value==="boolean") return true;
  if(typeof value==="number") return Number.isFinite(value);
  if(typeof value!=="object"||seen.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
  if (!Array.isArray(value) && Object.getOwnPropertySymbols(value).length) return false;
  seen.add(value);
  const valid=(Array.isArray(value)?value:Object.values(value)).every((item)=>validJson(item,seen)); seen.delete(value); return valid;
}
export async function openManagerInvocationSession<TMetadata=unknown,TResult extends JSONValue=JSONValue>(wire: Wire, definition?: ManagerInvocationDefinition<TMetadata,TResult>, signal?: AbortSignal): Promise<ManagerInvocationSession<TMetadata,TResult>> {
  const current=await wire.sendRPC({request:"getManager",payload:{}});
  if(!current.ok) throw new Error(current.error?.message??"Unable to read current manager");
  requiredId(current.result,"current manager ID");
  const caller = await wire.sendRPC({request:"getCallingManager",payload:{}});
  if(!caller.ok) throw new Error(caller.error?.message ?? "Unable to read calling manager");
  const value=caller.result;
  if(value===null||value===undefined) return {mode:"standalone"};
  requiredId(value,"calling manager ID");
  if(current.result===value) throw new TypeError("Calling manager cannot be the current manager");
  if(signal?.aborted) throw new DOMException("Invocation setup aborted","AbortError");
  if(!definition) return {mode:"called",context:undefined};
  const metadata=await wire.sendRPC({request:"getMetadata",payload:{}});
  if(!metadata.ok) throw new Error(metadata.error?.message??"Unable to read interface metadata");
  if(signal?.aborted) throw new DOMException("Invocation setup aborted","AbortError");
  const parsed=definition.parseMetadata(metadata.result);
  let closed=false;
  const close=(response: Parameters<Wire["close"]>[0])=>{
    if(closed||signal?.aborted) return;
    closed=true;
    wire.close(response);
  };
  return {mode:"called",context:{callingManagerId:value,metadata:parsed,
    complete(result:TResult){
      if(!validJson(result)) throw new TypeError("Invocation result must be JSON-compatible");
      definition.validateResult?.(result);
      close({manager:current.result as string,ok:true,result});
    },
    fail(error:ManagerInvocationError){
      if(!error||typeof error.message!=="string"||!error.message.trim()||error.status!==undefined&&!Number.isSafeInteger(error.status)||error.details!==undefined&&!validJson(error.details)) throw new TypeError("Invocation failure must have a message, integer status, and JSON details");
      close({manager:current.result as string,ok:false,error:{ message:error.message, ...(error.status === undefined ? {} : { status:error.status }), ...(error.details === undefined ? {} : { details:error.details }) }});
    },
  }};
}
