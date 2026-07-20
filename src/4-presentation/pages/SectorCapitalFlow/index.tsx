import { useState, useEffect, useMemo, type FC } from "react";
import { fetchSectorCapitalFlowSnapshot } from "@data/repository/sectorCapitalFlow";
import type { SectorCapitalFlowRow } from "@data/dto/sectorCapitalFlow";

type SortKey = "mainNetAmount"|"pctChg"|"strength"|"memberCount"|"relativeInflow"|"changeFromOpen";
const C={bg:"#0b0e14",card:"#131a24",border:"#1e2a36",up:"#ef4444",down:"#22c55e",text:"#e8edf5",sub:"#9aaec9",dim:"#4a6a8a",accent:"#f6b26b"};
const COLS:{key:SortKey;label:string;align:"left"|"right"}[]=[
{key:"mainNetAmount",label:"\u4E3B\u529B\u51C0\u6D41\u5165",align:"right"},
{key:"pctChg",label:"\u6DA8\u8DCC\u5E45",align:"right"},
{key:"strength",label:"\u5F3A\u5EA6",align:"right"},
{key:"relativeInflow",label:"\u76F8\u5BF9\u6D41\u5165",align:"right"},
{key:"changeFromOpen",label:"\u5F00\u76D8\u53D8\u5316",align:"right"},
{key:"memberCount",label:"\u6210\u5206\u80A1",align:"right"},
];
function yi(n:number):string{return(n/1e8).toFixed(2)+"\u4EBF"}
function pct(n:number):string{return n.toFixed(2)+"%"}

const SectorCapitalFlowPage:FC=()=>{
const[rows,setRows]=useState<SectorCapitalFlowRow[]>([]);
const[loading,setLoading]=useState(true);
const[error,setError]=useState<string|null>(null);
const[date,setDate]=useState("");
const[sk,setSk]=useState<SortKey>("mainNetAmount");
const[sd,setSd]=useState(true);
useEffect(()=>{(async()=>{try{setLoading(true);const r=await fetchSectorCapitalFlowSnapshot();setRows(r.data.rows);setDate(r.data.tradeDate)}catch(e){setError(e instanceof Error?e.message:"failed")}finally{setLoading(false)}})()},[]);
const sorted=useMemo(()=>{const s=[...rows].sort((a,b)=>(a[sk]??0)-(b[sk]??0));return sd?s.reverse():s},[rows,sk,sd]);
if(loading)return<div className="flex items-center justify-center h-64" style={{color:C.sub}}>\u52A0\u8F7D\u4E2D...</div>;
if(error)return<div className="flex items-center justify-center h-64" style={{color:C.up}}>\u9519\u8BEF: {error}</div>;
return(<div className="h-full overflow-auto px-4 py-4" style={{backgroundColor:C.bg}}>
<div className="flex items-center justify-between mb-4"><div><h1 className="text-lg font-bold" style={{color:C.text}}>\u677F\u5757\u8D44\u91D1\u6D41\u5411</h1><span className="text-xs" style={{color:C.dim}}>\u6570\u636E\u6765\u6E90: stock.quicktiny.cn | {date} | {rows.length} \u4E2A\u677F\u5757</span></div></div>
<div className="overflow-x-auto rounded-lg" style={{border:"1px solid "+C.border}}><table className="w-full text-xs"><thead><tr style={{backgroundColor:C.card,borderBottom:"1px solid "+C.border}}>
<th className="py-2 px-3 text-left" style={{color:C.dim,width:40}}>#</th>
<th className="py-2 px-3 text-left" style={{color:C.dim}}>\u677F\u5757</th>
{COLS.map(c=><th key={c.key} className={"py-2 px-3 cursor-pointer hover:text-white "+(c.align==="right"?"text-right":"text-left")} style={{color:sk===c.key?C.accent:C.dim}} onClick={()=>{if(c.key===sk)setSd(!sd);else{setSk(c.key);setSd(true)}}}>{c.label}{sk===c.key?(sd?" \u2193":" \u2191"):""}</th>)}
</tr></thead><tbody>{sorted.map((row,i)=><tr key={row.sectorCode} className="hover:bg-white/5" style={{borderBottom:"1px solid "+C.border}}>
<td className="py-2 px-3" style={{color:C.dim}}>{i+1}</td>
<td className="py-2 px-3 font-medium" style={{color:C.text}}>{row.sectorName}<span className="ml-1" style={{color:C.dim,fontSize:10}}>{row.sectorCode}</span></td>
<td className="py-2 px-3 text-right font-mono" style={{color:row.mainNetAmount>=0?C.up:C.down}}>{yi(row.mainNetAmount)}</td>
<td className="py-2 px-3 text-right font-mono" style={{color:row.pctChg>=0?C.up:C.down}}>{pct(row.pctChg)}</td>
<td className="py-2 px-3 text-right font-mono" style={{color:C.sub}}>{row.strength}</td>
<td className="py-2 px-3 text-right font-mono" style={{color:C.sub}}>{row.relativeInflow.toFixed(2)}</td>
<td className="py-2 px-3 text-right font-mono" style={{color:row.changeFromOpen>=0?C.up:C.down}}>{yi(row.changeFromOpen)}</td>
<td className="py-2 px-3 text-right" style={{color:C.sub}}>{row.memberCount}</td></tr>)}</tbody></table></div></div>)}
export default SectorCapitalFlowPage;
