import { useState } from "react";
import { AlertTriangle, ArrowRight, CalendarPlus, CheckCircle2 } from "lucide-react";

export const numberFormat = new Intl.NumberFormat("vi-VN");
export const currencyFormat = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
export const compactMoney = (value) => {
  const amount=Number(value)||0;
  if(Math.abs(amount)>=1e9)return `${(amount/1e9).toLocaleString("vi-VN",{maximumFractionDigits:2})} tỷ ₫`;
  if(Math.abs(amount)>=1e6)return `${(amount/1e6).toLocaleString("vi-VN",{maximumFractionDigits:2})} triệu ₫`;
  return currencyFormat.format(amount);
};
export const formatDate=(value)=>value?new Intl.DateTimeFormat("vi-VN").format(new Date(value)):"—";

const statusCopy={not_created:"Chưa có kỳ lương",draft:"Chưa có dữ liệu",importing:"Đang nhập dữ liệu",reconciling:"Đang đối soát",published:"Đã phát hành",adjusting:"Đang điều chỉnh",locked:"Đã khóa",error:"Có lỗi"};

export function YearSummary({ summary={} }){
  const rows=[{label:"Tổng quỹ lương năm",value:currencyFormat.format(summary.annualPayroll||0),note:"Thực lĩnh lũy kế"},{label:"Nhân sự bình quân",value:numberFormat.format(summary.averageEmployees||0),note:"Theo các kỳ có dữ liệu"},{label:"Lương bình quân",value:currencyFormat.format(summary.averageSalary||0),note:"Bình quân thực lĩnh"},{label:"Số kỳ đã phát hành",value:`${summary.releasedPeriods||0} / 12`,note:"Tiến độ năm"}];
  return <section className="pyc-summary">{rows.map((row)=><article key={row.label}><span>{row.label}</span><strong title={row.value}>{row.value}</strong><small>{row.note}</small></article>)}</section>;
}

export function PayrollMonthCard({ month,year,onOpen,onCreate }){
  const empty=month.status==="not_created";
  return <article className={`pyc-month is-${month.status}`} onClick={()=>!empty&&onOpen?.(month)}>
    <header><span>THÁNG {String(month.month).padStart(2,"0")}</span><i aria-label={statusCopy[month.status]} /></header>
    {empty?<div className="pyc-month__empty"><CalendarPlus/><strong>Chưa có kỳ lương</strong><span>Tháng {String(month.month).padStart(2,"0")}/{year}</span><button type="button" onClick={(event)=>{event.stopPropagation();onCreate?.(month);}}><CalendarPlus/>Tạo kỳ</button></div>:<>
      <div className="pyc-month__fund"><strong>{compactMoney(month.netSalary)}</strong><span>Tổng quỹ lương</span></div>
      <dl><div><dt>Nhân sự</dt><dd>{numberFormat.format(month.employeeCount)}</dd></div><div><dt>Bình quân</dt><dd>{compactMoney(month.averageSalary).replace(" ₫","")}/người</dd></div></dl>
      <p><span>Chi trả</span><strong>{formatDate(month.paymentDate)}</strong></p>
      <div className="pyc-month__progress"><span><i style={{width:`${month.progress}%`}}/></span><b>{month.progress}%</b></div>
      <footer><span>{statusCopy[month.status]||month.status}{month.warningCount?` · ${numberFormat.format(month.warningCount)} cảnh báo`:""}</span><ArrowRight/></footer>
    </>}
  </article>;
}

export function PayrollCalendar({months=[],year,onOpen,onCreate}){
  return <section className="pyc-section"><header className="pyc-section__head"><div><span>LỊCH TÀI CHÍNH</span><h2>12 tháng lương năm {year}</h2><p>Chọn một tháng để xem tiến độ, nhân viên và báo cáo chi tiết.</p></div><div className="pyc-legend"><span><i className="green"/>Đã phát hành</span><span><i className="blue"/>Đang xử lý</span><span><i className="amber"/>Chờ xử lý</span><span><i className="gray"/>Chưa tạo</span></div></header><div className="pyc-calendar">{months.map(month=><PayrollMonthCard key={month.month} month={month} year={year} onOpen={onOpen} onCreate={onCreate}/>)}</div></section>;
}

export function AnnualTrend({rows=[],year}){
  const [activeMonth,setActiveMonth]=useState(null);
  const max=Math.max(1,...rows.map(x=>Number(x.payrollFund)||0));
  const valid=rows.filter(x=>x.payrollFund>0);
  const points=rows.map((x,i)=>`${i*(100/11)},${88-(Number(x.averageSalary)||0)/Math.max(1,...rows.map(r=>Number(r.averageSalary)||0))*66}`).join(" ");
  const selected=rows.find(x=>x.month===activeMonth);
  return <section className="pyc-section pyc-trend"><header className="pyc-section__head"><div><span>XU HƯỚNG NĂM {year}</span><h2>Quỹ lương và lương bình quân</h2><p>Tổng hợp trực tiếp từ các phiếu lương trong năm.</p></div><div className="pyc-chart-legend"><span><i/>Quỹ lương</span><span><i/>Lương bình quân</span></div></header>{valid.length?<div className="pyc-chart"><div className="pyc-chart__plot" onMouseLeave={()=>setActiveMonth(null)}>{selected&&<div className="pyc-chart-tooltip"><span>THÁNG {String(selected.month).padStart(2,"0")}</span><strong>{currencyFormat.format(selected.payrollFund||0)}</strong><small>Bình quân {currencyFormat.format(selected.averageSalary||0)} · {numberFormat.format(selected.employeeCount||0)} nhân sự</small></div>}<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points}/></svg><div>{rows.map(row=><button type="button" key={row.month} className={activeMonth===row.month?"is-active":""} onMouseEnter={()=>setActiveMonth(row.month)} onFocus={()=>setActiveMonth(row.month)} aria-label={`Tháng ${row.month}: ${currencyFormat.format(row.payrollFund)}`}><i style={{height:`${Math.max(row.payrollFund?4:0,row.payrollFund/max*82)}%`}}/><small>{String(row.month).padStart(2,"0")}</small></button>)}</div></div></div>:<div className="pyc-empty"><CheckCircle2/><strong>Chưa có dữ liệu xu hướng</strong><span>Biểu đồ sẽ xuất hiện khi năm có phiếu lương.</span></div>}</section>;
}

export function YearSignals({issues=[],activities=[],onIssue}){
  return <div className="pyc-signals"><section className="pyc-section"><header className="pyc-section__head"><div><span>ƯU TIÊN</span><h2>Việc cần xử lý</h2></div></header>{issues.length?<div className="pyc-list">{issues.map(x=><button type="button" key={x.key} onClick={()=>onIssue?.(x)}><i className={`is-${x.severity}`}><AlertTriangle/></i><span>{x.label}</span><strong>{numberFormat.format(x.count)}</strong><ArrowRight/></button>)}</div>:<div className="pyc-empty compact"><CheckCircle2/><strong>Không có việc tồn đọng</strong><span>Dữ liệu hiện tại không có cảnh báo bắt buộc.</span></div>}</section><section className="pyc-section"><header className="pyc-section__head"><div><span>NHẬT KÝ VẬN HÀNH</span><h2>Hoạt động gần đây</h2></div></header>{activities.length?<div className="pyc-activity">{activities.slice(0,6).map((x,i)=><article key={`${x.timestamp}-${i}`}><i/><div><strong>{x.title}</strong><span>{x.actor||"Hệ thống"} · {x.timestamp?new Intl.DateTimeFormat("vi-VN",{dateStyle:"short",timeStyle:"short"}).format(new Date(x.timestamp)):"—"}</span></div></article>)}</div>:<div className="pyc-empty compact"><CheckCircle2/><strong>Chưa có hoạt động</strong><span>Nhật ký năm sẽ hiển thị tại đây.</span></div>}</section></div>;
}
