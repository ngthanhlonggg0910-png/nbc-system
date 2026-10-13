import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { createRequire } from "node:module";
import path from "node:path";
import {
  getAdminPayslipDetail, getPayrollAnalytics, getPayrollDashboard, getPayrollEmployees,
  getPayrollHistory, getPayrollMonthDetail, getPayrollYearCalendar,
} from "../../services/payroll/payrollDashboard.service.js";
import {
  buildAnnualExcelReport,
  buildAnnualPdfReport,
} from "../../services/payroll/export/payrollAnnualReport.exporter.js";

const require = createRequire(import.meta.url);
const fontPackageDir = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
const FONT_REGULAR = path.join(fontPackageDir, "ttf", "DejaVuSans.ttf");
const FONT_BOLD = path.join(fontPackageDir, "ttf", "DejaVuSans-Bold.ttf");

export async function getDashboard(req, res, next) {
  try {
    const data = await getPayrollDashboard({
      periodCode: req.query.periodCode || req.query.period,
      unitId: req.query.unitId,
      status: req.query.status,
      search: req.query.search,
    });
    return res.status(200).json({ success: true, message: "Lấy tổng quan quản lý lương thành công", data });
  } catch (error) {
    return next(error);
  }
}

export async function getYearCalendar(req,res,next){try{return res.status(200).json({success:true,message:"Lấy lịch lương năm thành công",data:await getPayrollYearCalendar(req.query)});}catch(error){return next(error);}}
export async function getMonthDetail(req,res,next){try{return res.status(200).json({success:true,message:"Lấy chi tiết kỳ lương thành công",data:await getPayrollMonthDetail({periodId:req.params.periodId,unitId:req.query.unitId})});}catch(error){return next(error);}}
export async function getPeriodEmployees(req,res,next){try{return res.status(200).json({success:true,message:"Lấy danh sách bảng lương thành công",data:await getPayrollEmployees({...req.query,periodId:req.params.periodId})});}catch(error){return next(error);}}
export async function getPeriodAnalytics(req,res,next){try{return res.status(200).json({success:true,message:"Lấy thống kê kỳ lương thành công",data:await getPayrollAnalytics({...req.query,periodId:req.params.periodId})});}catch(error){return next(error);}}
export async function getPeriodHistory(req,res,next){try{return res.status(200).json({success:true,message:"Lấy lịch sử kỳ lương thành công",data:await getPayrollHistory({periodId:req.params.periodId})});}catch(error){return next(error);}}
export async function getPayslipDetail(req,res,next){try{return res.status(200).json({success:true,message:"Lấy chi tiết phiếu lương thành công",data:await getAdminPayslipDetail({payslipId:req.params.payslipId})});}catch(error){return next(error);}}

const money=new Intl.NumberFormat("vi-VN");
function setDownload(res,buffer,fileName,type){res.setHeader("Content-Type",type);res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);return res.status(200).send(buffer);}
const STATUS_VN={not_created:"Chưa tạo",draft:"Nháp",importing:"Đang nhập",reconciling:"Đang đối soát",waiting_confirmation:"Chờ xác nhận",published:"Đã phát hành",adjusting:"Đang điều chỉnh",locked:"Đã khóa",error:"Có lỗi",paid:"Đã thanh toán",confirmed:"Đã xác nhận",employee_feedback:"Có phản hồi"};

async function employeeListPdf(rows,periodLabel){
  const doc=new PDFDocument({size:"A4",layout:"landscape",margin:40,bufferPages:true});
  const chunks=[];doc.on("data",(chunk)=>chunks.push(chunk));
  const finished=new Promise((resolve)=>doc.on("end",resolve));

  doc.font(FONT_BOLD).fontSize(16).fillColor("#123A69").text("Danh sách bảng lương");
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(9).fillColor("#6B7F94").text(`${periodLabel} · Xuất lúc ${new Date().toLocaleString("vi-VN")}${rows.length?` · ${rows.length} nhân viên`:""}`);
  doc.moveDown(0.8);

  const moneyCols=new Set(["gross","insurance","taxable","deduction","net"]);
  const cols=[
    {k:"staffId",t:"Mã NV",w:50},
    {k:"employeeName",t:"Nhân viên",w:110},
    {k:"unit",t:"Đơn vị",w:78},
    {k:"department",t:"Phòng ban",w:74},
    {k:"gross",t:"Tổng thu nhập",w:80},
    {k:"insurance",t:"TN BHXH",w:64},
    {k:"taxable",t:"Chịu thuế",w:64},
    {k:"deduction",t:"Khấu trừ",w:60},
    {k:"net",t:"Thực lĩnh",w:74},
    {k:"status",t:"Trạng thái",w:64},
  ];
  const totalW=cols.reduce((sum,c)=>sum+c.w,0);
  const MONEY_FIELD={gross:"grossIncome",insurance:"insuranceIncome",taxable:"taxableIncome",deduction:"totalDeductions",net:"netSalary"};
  const cellValue=(row,col)=>{
    if(col.k==="unit")return row.unit?.name||"—";
    if(col.k==="department")return row.department?.name||"—";
    if(col.k==="status")return STATUS_VN[row.status]||row.status||"—";
    if(moneyCols.has(col.k))return money.format(row[MONEY_FIELD[col.k]]??0);
    return String(row[col.k]??"");
  };
  const drawHeader=()=>{
    const y=doc.y;
    doc.save().rect(doc.page.margins.left-6,y-4,totalW+12,20).fill("#123A69").restore();
    let x=doc.page.margins.left;
    cols.forEach((col)=>{
      doc.font(FONT_BOLD).fontSize(8).fillColor("#FFFFFF").text(col.t,x,y+3,{width:col.w-6,align:moneyCols.has(col.k)?"right":"left",lineBreak:false});
      x+=col.w;
    });
    doc.y=y+20;
  };
  const ensureSpace=(height)=>{
    if(doc.y+height>doc.page.height-doc.page.margins.bottom){doc.addPage();drawHeader();}
  };

  if(!rows.length){
    doc.font(FONT_REGULAR).fontSize(10).fillColor("#6B7F94").text("Không có dữ liệu bảng lương cho kỳ này.");
  }else{
    drawHeader();
    rows.forEach((row,index)=>{
      ensureSpace(19);
      const y=doc.y;
      if(index%2===0){
        doc.save().rect(doc.page.margins.left-6,y-3,totalW+12,16).fill("#F2F7FB").restore();
      }
      let x=doc.page.margins.left;
      cols.forEach((col)=>{
        doc.font(FONT_REGULAR).fontSize(8).fillColor("#19324F").text(cellValue(row,col),x,y,{width:col.w-6,align:moneyCols.has(col.k)?"right":"left",lineBreak:false});
        x+=col.w;
      });
      doc.y=y+13;
    });
  }

  const range=doc.bufferedPageRange();
  for(let i=range.start;i<range.start+range.count;i++){
    doc.switchToPage(i);
    doc.font(FONT_REGULAR).fontSize(8).fillColor("#6B7F94").text(`Trang ${i+1}/${range.count}`,40,doc.page.height-28,{width:doc.page.width-80,align:"right",lineBreak:false});
  }
  doc.end();
  await finished;
  return Buffer.concat(chunks);
}

export async function exportAnnualReport(req, res, next) {
  try {
    const data = await getPayrollYearCalendar(req.query);
    const format = req.query.format === "pdf" ? "pdf" : "xlsx";
    if (format === "pdf") {
      return setDownload(
        res,
        await buildAnnualPdfReport(data),
        `bao-cao-quan-tri-luong-${data.year}.pdf`,
        "application/pdf",
      );
    }
    return setDownload(
      res,
      await buildAnnualExcelReport(data),
      `bao-cao-quan-tri-luong-${data.year}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  } catch (error) {
    return next(error);
  }
}

export async function exportPeriodEmployees(req,res,next){try{const data=await getPayrollEmployees({...req.query,periodId:req.params.periodId,page:1,limit:100});const total=data.pagination.total,rows=[...data.employees];for(let page=2;page<=Math.ceil(total/100);page++){const nextPage=await getPayrollEmployees({...req.query,periodId:req.params.periodId,page,limit:100});rows.push(...nextPage.employees);}const format=req.query.format==="pdf"?"pdf":"xlsx";if(format==="pdf"){let periodLabel=`Kỳ ${req.params.periodId}`;try{const detail=await getPayrollMonthDetail({periodId:req.params.periodId});periodLabel=detail?.period?.name||detail?.period?.code||periodLabel;}catch{}return setDownload(res,await employeeListPdf(rows,periodLabel),`danh-sach-bang-luong-${req.params.periodId}.pdf`,"application/pdf");}const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet("Bảng lương");ws.columns=[{header:"Mã NV",key:"staffId",width:16},{header:"Nhân viên",key:"name",width:28},{header:"Đơn vị",key:"unit",width:24},{header:"Phòng ban",key:"department",width:24},{header:"Tổng thu nhập",key:"gross",width:20},{header:"Thu nhập BHXH",key:"insurance",width:20},{header:"Thu nhập chịu thuế",key:"taxable",width:20},{header:"Khấu trừ",key:"deduction",width:20},{header:"Thực lĩnh",key:"net",width:20},{header:"Trạng thái",key:"status",width:18}];rows.forEach(r=>ws.addRow({staffId:r.staffId,name:r.employeeName,unit:r.unit?.name,department:r.department?.name,gross:r.grossIncome,insurance:r.insuranceIncome,taxable:r.taxableIncome,deduction:r.totalDeductions,net:r.netSalary,status:r.status}));ws.getRow(1).font={bold:true};return setDownload(res,await wb.xlsx.writeBuffer(),`danh-sach-bang-luong-${req.params.periodId}.xlsx`,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");}catch(error){return next(error);}}
