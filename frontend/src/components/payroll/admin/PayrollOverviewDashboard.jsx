import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";

import { downloadPayrollAnnualReport, getPayrollYearCalendar } from "../../../api/payroll/payrollDashboard.api";
import PayrollPeriodDrilldown from "./PayrollPeriodDrilldown";
import { AnnualTrend, PayrollCalendar, YearSignals, YearSummary, currencyFormat, numberFormat } from "./PayrollYearCalendar";
import PayrollPeriodForm from "../periods/PayrollPeriodForm";

import "../../../styles/components/payroll-year-calendar.css";
import "../../../styles/components/payroll-overview-polish.css";

const unwrap=(response)=>response?.data;
const errorMessage=(error)=>error?.response?.data?.message||error?.message||"Không thể tải dữ liệu lương.";
const save=(response,fallback)=>{const url=URL.createObjectURL(response.data);const a=document.createElement("a");a.href=url;const d=response.headers?.["content-disposition"]||"";const m=d.match(/filename\*=UTF-8''([^;]+)/i);a.download=m?.[1]?decodeURIComponent(m[1]):fallback;a.click();URL.revokeObjectURL(url);};

function Skeleton(){return <div className="pyc-skeleton"><section>{Array.from({length:4},(_,i)=><i key={i}/>)}</section><div>{Array.from({length:12},(_,i)=><i key={i}/>)}</div><b/></div>}

export default function PayrollOverviewDashboard({onOpenBoard,onCreatePeriod}){
  const [year,setYear]=useState(new Date().getFullYear()),[unitId,setUnitId]=useState(""),[mode,setMode]=useState("calendar");
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[refresh,setRefresh]=useState(0),[month,setMonth]=useState(null),[createMonth,setCreateMonth]=useState(null),[createMax,setCreateMax]=useState(false),[exporting,setExporting]=useState(false);
  useEffect(()=>{const c=new AbortController();setLoading(true);getPayrollYearCalendar({year,unitId},{signal:c.signal}).then(r=>{setData(unwrap(r));setError("");}).catch(e=>{if(!c.signal.aborted)setError(errorMessage(e));}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[year,unitId,refresh]);
  const years=useMemo(()=>{const source=(data?.filters?.periods||[]).map(p=>Number(String(p.code).slice(0,4))).filter(Boolean);return [...new Set([year-1,year,year+1,...source])].sort();},[data,year]);
  const createDefaults=useMemo(()=>{if(!createMonth)return null;const code=`${year}-${String(createMonth.month).padStart(2,"0")}`,end=new Date(year,createMonth.month,0).getDate();return {periodCode:code,periodName:`Kỳ lương tháng ${String(createMonth.month).padStart(2,"0")}/${year}`,startDate:`${code}-01`,endDate:`${code}-${end}`,paymentDate:""};},[createMonth,year]);
  const doExport=async(format)=>{setExporting(true);try{save(await downloadPayrollAnnualReport({year,unitId,format}),`bao-cao-${year}.${format}`);}catch(e){setError(errorMessage(e));}finally{setExporting(false);}};
  useEffect(()=>{const handler=()=>doExport("xlsx");window.addEventListener("nbc:payroll-export-year",handler);return()=>window.removeEventListener("nbc:payroll-export-year",handler);},[year,unitId]);
  const create=async(payload)=>{await onCreatePeriod?.(payload);setCreateMonth(null);setRefresh(x=>x+1);};
  return <div className="payroll-year-calendar">
    <section className="pyc-controls"><div className="pyc-year"><button type="button" onClick={()=>setYear(x=>x-1)}><ChevronLeft/></button><label><span>NĂM</span><select value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(x=><option key={x}>{x}</option>)}</select></label><button type="button" onClick={()=>setYear(x=>x+1)}><ChevronRight/></button></div><label><span>Nhà máy / đơn vị</span><select value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">Tất cả đơn vị</option>{(data?.filters?.units||[]).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label><div className="pyc-mode"><button type="button" className={mode==="calendar"?"active":""} onClick={()=>setMode("calendar")}>Tổng quan năm</button><button type="button" className={mode==="report"?"active":""} onClick={()=>setMode("report")}><BarChart3/>Báo cáo 12 tháng</button></div><button type="button" className="pyc-refresh" onClick={()=>setRefresh(x=>x+1)}><RefreshCw/>Làm mới</button></section>
    {error&&<div className="pyc-error"><AlertTriangle/><span>{error}</span><button type="button" onClick={()=>setRefresh(x=>x+1)}>Thử lại</button></div>}
    {loading&&!data?<Skeleton/>:<>
      {mode==="report"&&<section className="pyc-annual-report"><header><div><span>BÁO CÁO 12 THÁNG</span><h2>Bức tranh quỹ lương năm {year}</h2><p>Một lớp số liệu duy nhất, tập trung vào quy mô, bình quân và tiến độ phát hành.</p></div><div><button type="button" disabled={exporting} onClick={()=>doExport("xlsx")}><Download/>Excel</button><button type="button" disabled={exporting} onClick={()=>doExport("pdf")}><Download/>PDF</button></div></header><div className="pyc-report-metrics"><article className="primary"><span>Quỹ lương thực nhận lũy kế</span><strong>{currencyFormat.format(data?.summary?.annualPayroll||0)}</strong><small>Tổng hợp từ các kỳ có dữ liệu</small></article><article><span>Lương bình quân</span><strong>{currencyFormat.format(data?.summary?.averageSalary||0)}</strong><small>Bình quân thực lĩnh</small></article><article><span>Nhân sự bình quân</span><strong>{numberFormat.format(data?.summary?.averageEmployees||0)}</strong><small>Trên các kỳ đã ghi nhận</small></article><article className="progress"><span>Tiến độ phát hành</span><strong>{data?.summary?.releasedPeriods||0} / 12 kỳ</strong><div><i style={{width:`${Math.min(100,((data?.summary?.releasedPeriods||0)/12)*100)}%`}}/></div><small>{Math.round(((data?.summary?.releasedPeriods||0)/12)*100)}% kế hoạch năm</small></article></div></section>}
      {mode==="calendar"&&<YearSummary summary={data?.summary}/>}
      {mode==="calendar"&&<PayrollCalendar months={data?.months||[]} year={year} onOpen={setMonth} onCreate={setCreateMonth}/>}
      <AnnualTrend rows={data?.trend||[]} year={year}/>
      <YearSignals issues={data?.issues||[]} activities={data?.activities||[]} onIssue={()=>onOpenBoard?.("adjustment")}/>
    </>}
    {month&&<PayrollPeriodDrilldown month={month} year={year} unitId={unitId} onClose={()=>setMonth(null)} onManage={()=>{setMonth(null);onOpenBoard?.("periods",month);}} onImport={()=>{setMonth(null);onOpenBoard?.("import");}} onPublish={()=>{setMonth(null);onOpenBoard?.("publish");}} onAdjust={()=>{setMonth(null);onOpenBoard?.("adjustment");}}/>}
    {createMonth&&<div className="pyc-create-modal" role="dialog" aria-modal="true"><div className={createMax?"pyc-create-max":""}><header><div><span>TẠO KỲ LƯƠNG</span><h2>Tháng {String(createMonth.month).padStart(2,"0")}/{year}</h2></div><button type="button" title={createMax?"Thu nhỏ":"Phóng toàn màn hình"} onClick={()=>setCreateMax(v=>!v)}>{createMax?<Minimize2 size={15}/>:<Maximize2 size={14}/>}</button><button type="button" onClick={()=>{setCreateMonth(null);setCreateMax(false);}}>×</button></header><PayrollPeriodForm initialValues={createDefaults} onSubmit={create} onCancel={()=>{setCreateMonth(null);setCreateMax(false);}}/></div></div>}
  </div>;
}
