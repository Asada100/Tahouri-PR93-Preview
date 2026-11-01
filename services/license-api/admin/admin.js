const API="https://tahouri-license-api-pr93-e2e.asadtahouri1986.workers.dev";
let loggedIn=false;
async function api(p,o={}){const r=await fetch(API+p,{...o,credentials:"include",headers:{"Content-Type":"application/json",...(o.headers||{})}});const d=await r.json().catch(()=>({message:"پاسخ نامعتبر"}));if(r.status===401 && !p.endsWith("/login")){showLogin();throw Error("نشست مدیر معتبر نیست.");}if(!r.ok)throw Error(d.message||"خطا");return d}
function e(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showLogin(){loggedIn=false;document.getElementById("loginCard").hidden=false;document.getElementById("panel").hidden=true}
function showPanel(){loggedIn=true;document.getElementById("loginCard").hidden=true;document.getElementById("panel").hidden=false}
async function login(){const input=document.getElementById("adminKey"),err=document.getElementById("loginError");err.hidden=true;try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({password:input.value})});input.value="";showPanel();await loadAll()}catch(x){err.textContent=x.message;err.hidden=false}}
async function logout(){try{await api("/api/admin/logout",{method:"POST"})}finally{showLogin()}}
async function checkSession(){try{const d=await api("/api/admin/session");if(d.ok){showPanel();await loadAll()}else showLogin()}catch{showLogin()}}
async function loadHealth(){try{const d=await fetch(API+"/api/health",{cache:"no-store"}).then(r=>r.json());document.getElementById("health").textContent=d.ok?"سرویس سالم":"سرویس نیازمند بررسی";document.getElementById("healthDot").className=d.ok?"ok":"bad"}catch{document.getElementById("health").textContent="عدم اتصال";document.getElementById("healthDot").className="bad"}}
async function loadMetrics(){try{const d=await api("/api/metrics");const m=d.metrics;document.getElementById("stats").innerHTML=[
["درخواست‌ها",m.requests],["فعال‌سازی موفق",m.activations],["خطاهای فعال‌سازی",m.activationFailures],["لغو مجوز",m.licenseRevocations],["خطاهای 5xx",m.responses5xx]
].map(x=>"<div class='stat'><strong>"+e(x[1])+"</strong><span>"+e(x[0])+"</span></div>").join("")}catch{}}
async function loadAlerts(){try{const d=await api("/api/metrics/alerts"),card=document.getElementById("alertsCard");if(!d.alerts.length){card.hidden=true;return}card.hidden=false;document.getElementById("alerts").innerHTML=d.alerts.map(a=>"<div class='alert "+e(a.severity)+"'><strong>"+e(a.code)+"</strong><span>"+e(a.message)+"</span></div>").join("")}catch{}}
async function loadStudents(){
  const d=await api("/api/admin/students");
  const active=d.students.filter(x=>x.status==="active");
  const select=document.getElementById("studentId");
  const previous=select.value;
  select.innerHTML='<option value="">انتخاب دانش‌آموز ثبت‌شده</option>'+active.map(x=>'<option value="'+e(x.studentId)+'" data-grade="'+e(x.gradeId)+'">'+e(x.fullName)+' — '+e(x.gradeId)+' — '+e(x.studentId)+'</option>').join("");
  if(active.some(x=>x.studentId===previous))select.value=previous;
  document.getElementById("students").innerHTML=table(["نام دانش‌آموز","شناسهٔ حساب","پایه","وضعیت","تاریخ ثبت"],d.students.map(x=>[x.fullName,x.studentId,x.gradeId,x.status==="active"?"فعال":"بایگانی‌شده",x.createdAt])) + d.students.map(x=>"<button data-copy-student='"+e(x.studentId)+"'>کپی شناسهٔ "+e(x.fullName)+"</button>"+(x.status==="active"?" <button class='danger' data-archive-student='"+e(x.studentId)+"'>بایگانی</button>":"")).join("");
  document.getElementById("students").querySelectorAll("[data-archive-student]").forEach(button=>button.addEventListener("click",()=>archiveStudent(button.dataset.archiveStudent)));
  document.getElementById("students").querySelectorAll("[data-copy-student]").forEach(button=>button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(button.dataset.copyStudent);button.textContent="شناسه کپی شد";}catch{button.textContent="کپی خودکار در دسترس نیست؛ شناسه را از جدول انتخاب کنید";}}));
  select.onchange=()=>{const opt=select.selectedOptions[0];if(opt?.dataset.grade)document.getElementById("grade").value=opt.dataset.grade};
}
async function createStudent(){
  try{
    const fullName=document.getElementById("studentFullName").value.trim();
    const gradeId=document.getElementById("studentGrade").value;
    if(!fullName)throw Error("نام دانش‌آموز را وارد کنید.");
    const d=await api("/api/admin/students",{method:"POST",body:JSON.stringify({fullName,gradeId})});
    document.getElementById("studentFullName").value="";
    await loadStudents();
    document.getElementById("studentId").value=d.student.studentId;
    document.getElementById("grade").value=d.student.gradeId;
    alert("حساب ثبت شد. شناسهٔ دانش‌آموز را در سوابق نگه دارید.");
  }catch(x){alert(x.message)}
}
async function archiveStudent(studentId){
  if(!confirm("حساب دانش‌آموز بایگانی شود؟ کد جدید برای آن صادر نخواهد شد."))return;
  try{await api("/api/admin/students/archive",{method:"POST",body:JSON.stringify({studentId})});await loadStudents();await loadCodes()}catch(x){alert(x.message)}
}
async function loadCodes(){const d=await api("/api/admin/codes");document.getElementById("codes").innerHTML=table(["کد","شناسه دانش‌آموز","پایه","سال","نوع رزرو","وضعیت","ساخته‌شده","استفاده‌شده","مجوز"],d.codes.map(x=>[x.codePreview,x.studentId||"کد قدیمیِ بدون اتصال",x.gradeId,x.academicYear,x.renewalMode==="repeat"?"تکرار پایه":"پایه سال بعد",x.status,x.createdAt,x.usedAt||"—",x.licenseId||"—"]))}
async function loadLicenses(){const d=await api("/api/admin/licenses");document.getElementById("licenses").innerHTML=table(["مجوز","پروفایل","پایه","سال","از","تا","وضعیت"],d.licenses.map(x=>[x.licenseId,x.studentId,x.gradeId,x.academicYear,x.validFrom,x.validUntil,x.status]))}
async function loadPayments(){const d=await api("/api/admin/payments");document.getElementById("payments").innerHTML=table(["شناسه","درگاه","وضعیت","مبلغ","پایه","سال","مجوز","زمان"],d.payments.map(x=>[x.paymentId,x.provider,x.status,(x.amount??"")+" "+(x.currency??""),x.gradeId||"—",x.academicYear||"—",x.licenseId||"—",x.createdAt]))}
async function loadAudit(){const d=await api("/api/admin/audit");document.getElementById("audit").innerHTML=table(["رویداد","عامل","مجوز","زمان","جزئیات"],d.audit.map(x=>[x.eventType,x.actor,x.licenseId||"—",x.createdAt,JSON.stringify(x.metadata||{})]))}
function table(headers,rows){if(!rows.length)return "<p class='muted'>موردی وجود ندارد.</p>";return "<div class='table-wrap'><table><thead><tr>"+headers.map(h=>"<th>"+e(h)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(r=>"<tr>"+r.map(v=>"<td>"+e(v)+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>"}
async function createCodes(){try{const studentId=document.getElementById("studentId").value.trim();if(!studentId)throw Error("شناسهٔ دانش‌آموز الزامی است.");const d=await api("/api/admin/codes",{method:"POST",body:JSON.stringify({studentId,gradeId:document.getElementById("grade").value.trim(),academicYear:document.getElementById("year").value.trim(),renewalMode:document.getElementById("renewalMode").value})});const box=document.getElementById("newCodes");box.textContent=d.codes.join("\n");box.hidden=false;await loadCodes();alert("کد اختصاصی ساخته شد. کد کامل را فقط به سرپرست همان دانش‌آموز تحویل دهید و همین حالا ذخیره کنید.")}catch(x){alert(x.message)}}
async function revokeCode(){try{const code=document.getElementById("revokeCode").value.trim();if(!code)throw Error("کد را وارد کنید.");if(!confirm("این کد لغو شود؟"))return;await api("/api/admin/codes/revoke",{method:"POST",body:JSON.stringify({code})});document.getElementById("revokeCode").value="";await loadCodes();alert("کد لغو شد.")}catch(x){alert(x.message)}}
async function revokeLicense(){try{const licenseId=document.getElementById("licenseIdAction").value.trim();if(!licenseId)throw Error("License ID را وارد کنید.");if(!confirm("این مجوز لغو شود؟"))return;await api("/api/admin/licenses/revoke",{method:"POST",body:JSON.stringify({licenseId})});await loadLicenses();alert("مجوز لغو شد.")}catch(x){alert(x.message)}}
async function extendLicense(){try{const licenseId=document.getElementById("licenseIdAction").value.trim(),v=document.getElementById("extendUntil").value;if(!licenseId||!v)throw Error("License ID و تاریخ پایان را وارد کنید.");await api("/api/admin/licenses/extend",{method:"POST",body:JSON.stringify({licenseId,validUntil:new Date(v).toISOString()})});await loadLicenses();alert("مجوز تمدید شد.")}catch(x){alert(x.message)}}
async function searchAll(){try{const q=document.getElementById("searchQ").value.trim();if(!q)throw Error("عبارت جستجو را وارد کنید.");const d=await api("/api/admin/search?q="+encodeURIComponent(q));document.getElementById("searchResults").innerHTML="<h3>مجوزها</h3>"+table(["مجوز","پروفایل","پایه","سال","وضعیت"],d.licenses.map(v=>[v.licenseId,v.studentId,v.gradeId,v.academicYear,v.status]))+"<h3>کدها</h3>"+table(["کد","شناسه دانش‌آموز","پایه","سال","وضعیت","مجوز"],d.codes.map(v=>[v.codePreview,v.studentId||"کد قدیمیِ بدون اتصال",v.gradeId,v.academicYear,v.status,v.licenseId||"—"]))}catch(x){alert(x.message)}}
async function loadAll(){await loadHealth();await Promise.all([loadMetrics(),loadAlerts(),loadStudents(),loadCodes(),loadLicenses(),loadPayments(),loadAudit()])}
loadHealth();checkSession();