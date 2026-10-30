# 🎓 ระบบเช็คชื่อเข้าแถวและจัดการแก้กิจกรรมเข้าแถว (LineCheck+ Attendance & Remedial System)

ระบบ Full-Stack สำหรับสถานศึกษาในการบริหารจัดการ **การเช็คชื่อเข้าแถวหน้าเสาธงประจำวัน**, คำนวณเวลาเข้าร่วมกิจกรรมตามเกณฑ์ขั้นต่ำ **80%** โดยอัตโนมัติ และบริหารจัดการ **การส่งงานจิตอาสา/บำเพ็ญประโยชน์เพื่อแก้แถว (Remedial Activity Offset)** พร้อมแยกสัดส่วน **ระบบหน้าบ้าน (Front-Office)** และ **ระบบจัดการหลังบ้าน (Back-Office Admin Control Center)** อย่างชัดเจน รองรับการใช้งานทุกแพลตฟอร์ม (Mobile, Tablet, Desktop, PWA)

---

## 🛠️ Tech Stack
- **Framework & Runtime**: Next.js 16.3.4 (App Router + Server Actions), React 19.2.8, TypeScript 5
- **Styling & Theme**: Tailwind CSS v4 (`@tailwindcss/postcss`), `tw-animate-css`, `next-themes` (โหมดกลางวัน / กลางคืน + 6 โทนสีพื้นหลัง + 3 ลวดลายพื้นหลัง)
- **UI & Components**: shadcn/ui (`@base-ui/react`, `@radix-ui/react-slot`, `@radix-ui/react-label`), `lucide-react`, `framer-motion 13`, `sonner`
- **Database & ORM**: MySQL, Prisma 6 (`prisma/schema.prisma`, `tsx prisma/seed.ts`)
- **State, Forms & Validation**: Zustand 5, React Hook Form, Zod 4 (`@hookform/resolvers/zod`), `date-fns 4`, `react-day-picker 10`
- **Data Table, Charts & Auth**: `@tanstack/react-table v9`, `recharts 3`, `next-auth v5` (Auth.js JWT Role-based `TEACHER` / `ADMIN`)

---

## 🚀 วิธีการติดตั้งและรันระบบ (Quick Start)

### 1. ติดตั้ง Dependencies และฐานข้อมูล
```bash
# ติดตั้งแพ็กเกจทั้งหมด
npm install --legacy-peer-deps

# สร้าง Prisma Client และซิงค์โครงสร้างตารางลง MySQL (linecheck_plus)
npx prisma generate
npx prisma db push

# สร้างข้อมูลจำลองเริ่มต้น (นักเรียน 24 คน, 4 ห้องเรียน, ประวัติเช็คชื่อ 10 วันทำการ)
npx tsx prisma/seed.ts
```

### 2. รันระบบ (Local Development & Multi-Device LAN)
```bash
# วิธีที่ 1: ดับเบิลคลิกไฟล์ลัด (สำหรับ Windows)
dev.bat          # รันโหมดพัฒนาพร้อมเปิดเบราว์เซอร์อัตโนมัติ (Port 3088)
deploy.bat       # ติดตั้ง + Build + รัน Production Server อัตโนมัติ

# วิธีที่ 2: รันผ่านคำสั่ง Terminal (รองรับ Windows / macOS / Linux)
npm run dev      # รันเซิร์ฟเวอร์ที่พอร์ต 3088 (รองรับเข้าผ่านมือถือในวง Wi-Fi เดียวกัน)
```

เปิดเว็บเบราว์เซอร์ที่: **http://localhost:3088/**

---

## 🌟 ฟังก์ชันหลัก (Key Features)

1. **Executive Statistics Dashboard (`/dashboard`)**:
   - การ์ดสรุปจำนวนนักเรียนทั้งหมด, อัตราการเข้าแถวประจำวัน (%), รายการแก้แถวรออนุมัติ และจำนวนนักเรียนที่ต่ำกว่าเกณฑ์ (< 80%)
   - กราฟผสมแท่งและเส้นแนวโน้มการเข้าแถวรายสัปดาห์ (`ComposedChart` จาก Recharts 3)
   - กราฟโดนัท (`PieChart`) เปรียบเทียบสัดส่วนนักเรียนที่ผ่านเกณฑ์ปกติ, ผ่านเกณฑ์หลังแก้แถว และผู้ที่ต้องแก้แถว
2. **Daily Attendance Check (`/attendance/check`)**:
   - ตัวกรองห้องเรียน (`ม.4/1`, `ม.4/2`, `ม.5/1`, `ม.6/1` หรือทุกห้อง) เชื่อมต่อกับ Zustand Global State
   - ปฏิทินเลือกวันที่เช็คชื่อภาษาไทย (`react-day-picker 10` + `date-fns 4`)
   - ปุ่มลัด **"มาทุกคน (Mark All Present)"** และปุ่ม **"บันทึกข้อมูล (Save)"** แบบ Optimistic UI (`useOptimistic`) พร้อมแจ้งเตือนผ่าน `sonner`
   - ปุ่มสวิตช์เลือกสถานะรายบุคคล `[มา] [สาย] [ขาด] [ลา]` พร้อมช่องกรอกหมายเหตุ
3. **Remedial & Deficit Management System (`/attendance/remedial`)**:
   - ตารางอัจฉริยะ `@tanstack/react-table v9` คัดกรองนักเรียนที่มีเวลาเข้าแถวต่ำกว่าเกณฑ์มาตรฐาน **80%**
   - แบบฟอร์มส่งงานกิจกรรมจิตอาสา/แก้แถว เลือกวันที่ขาดแถวที่ต้องการนำมาชดเชย พร้อมระบุชั่วโมงและแนบลิงก์รูปภาพหลักฐาน
   - ระบบตรวจสอบและกด **อนุมัติ (Approve) / ไม่อนุมัติ (Reject)** โดยคำนวณปรับเพิ่มเปอร์เซ็นต์เวลาเข้าแถวสุทธิให้โดยอัตโนมัติทันที
4. **Separated Front-Office & Back-Office Architecture (`/admin`)**:
   - **โซนหน้าบ้าน (Front-Office)**: สำหรับครูที่ปรึกษาเช็คชื่อประจำวัน ดูสถิติ และส่งงานแก้แถว
   - **โซนหลังบ้าน (Back-Office Control Center - `/admin`)**: แยกแถบเมนูและ Sidebar สำหรับบริหารจัดการทะเบียนนักเรียน (เพิ่ม/แก้ไข/ย้ายห้อง/พักการเรียน), จัดการห้องเรียน, จัดการบัญชีครูและสิทธิ์ `TEACHER` / `ADMIN`, และจัดการล้างประวัติการเช็คชื่อรายวัน
5. **Adaptive Day / Night / Color & Background Customizer**:
   - สลับโหมดแสง **☀️ กลางวัน (Day)** / **🌙 กลางคืน (Night)** / **💻 ตามระบบ**
   - เลือกโทนสีประจำระบบได้ 6 โทนสี (**ฟ้าคราม Ocean**, **เขียวมรกต Emerald**, **ม่วงอเมทิสต์ Violet**, **ชมพูซากุระ Rose**, **ส้มอำพัน Amber**, **ฟ้าน้ำทะเล Teal**) และลวดลายพื้นหลัง 3 รูปแบบ (**ไล่เฉดสีออร่า**, **ลายจุดตาราง**, **สีพื้นเรียบ**)
6. **Multi-Platform & PWA Support (รองรับทุกแพลตฟอร์ม)**:
   - รองรับทั้งคอมพิวเตอร์ (Windows, macOS, Linux), แท็บเล็ต (iPad) และสมาร์ตโฟน (iOS, Android)
   - มีแถบเมนูด้านล่างสำหรับมือถือ (Mobile Bottom Navigation) และแถบปุ่มบันทึกด่วนลอยตัว พร้อมรองรับการติดตั้งลงหน้าจอโฮม (PWA Web App Manifest)

---

## 📝 ประวัติการอัปเดตระบบ (Changelog)

### [v2.0.4] - 30 ตุลาคม 2569
- Release v2.0.4: อัปเดตระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน


### [v2.0.3] - 29 ตุลาคม 2569
- Release v2.0.3: อัปเดตระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน


### [v2.0.2] - 29 ตุลาคม 2569
- Release v2.0.2: อัปเดตระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน


### [v2.0.1] - 29 ตุลาคม 2569
- Release v2.0.1: อัปเดตระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน


### [v2.0.0] - 29 ตุลาคม 2569
- **เชื่อมต่อฐานข้อมูลคลาวด์จริง (Aiven Cloud MySQL 8.4)**:
  - เชื่อมต่อผ่านพอร์ตมาตรฐาน `26460` พร้อมระบบความปลอดภัย TLS/SSL (`sslmode=require`)
  - รองรับการทำงานคู่ขนานทั้งในเครื่อง (Local MAMP/XAMPP) และระบบคลาวด์ Production บน Vercel
- **Deploy ขึ้น Vercel Production สมบูรณ์**:
  - ผูกคลังโค้ด GitHub (`parksiwasup/LineCheck-`) เข้ากับ Vercel ให้สร้างเว็บใหม่อัตโนมัติเมื่อมีการอัปเดต
  - แก้ไขปัญหา Server Error 500 (`ERROR 3458627016`) โดยกำหนดค่า Environment Variables ของ Database และ Auth บน Vercel ครบถ้วน
- **ปรับแต่ง Batch Scripts & Multi-Device Compatibility**:
  - ปรับปรุง `dev.bat`, `deploy.bat`, `deploy-vercel.bat`, และ `push-github.bat` ให้ตรวจหา Git และ MySQL (MAMP, XAMPP, MySQL Server, MariaDB) อัตโนมัติแบบ Dynamic
  - แปลงรูปแบบไฟล์เป็น Windows CRLF ป้องกันปัญหาคำสั่ง cmd.exe เด้งดับเมื่อย้ายไปเปิดบนคอมพิวเตอร์เครื่องอื่น
- **ระบบปฏิทินเช็คชื่อรายเดือน (Monthly Attendance Calendar)**:
  - เพิ่มหน้าปฏิทิน (`/attendance/calendar`) แสดงสถานะการเข้าแถวรายเดือนของนักเรียนแต่ละคนอย่างชัดเจน


### [v1.5.0] - 28 ตุลาคม 2569
- **ระบบแก้แถวตามเกณฑ์ระเบียบโรงเรียนใหม่**:
  - **เกณฑ์ภาคเรียน**: เป้าหมายเข้าแถวครบ 45 ครั้งตลอดภาคเรียน (แสดง Progress bar, ขาดอีกกี่ครั้ง, ยอดสะสมรวมงานแก้แถว)
  - **เกณฑ์ประจำสัปดาห์ (จันทร์-ศุกร์)**: ต้องมาอย่างน้อย 3 วัน พร้อม 5-Day Mini Tracker (`[จ] [อ] [พ] [พฤ] [ศ]`) และเตือนตกเกณฑ์สัปดาห์
  - ฟิลเตอร์สถานะด่วน: `ทั้งหมด`, `ตกเกณฑ์สัปดาห์นี้`, `ยังไม่ครบ 45 ครั้ง`, `รอตรวจงาน`, `ครบ 45 ครั้ง`
  - เอกสารราชการพิมพ์ใบแจ้งแก้แถว (`PrintableNoticeModal`) และการส่งออกรายงาน Excel ตามเกณฑ์ใหม่
- **ระบบเช็กชื่อแถวแบบ Binary (มา / ขาด)**:
  - ลดทอนความซับซ้อน ปรับปุ่มเช็กชื่อเป็น **"มา"** 🟢 และ **"ขาด"** 🔴 ขนาดใหญ่ สัมผัสง่าย
  - ซิงค์ Dashboard (กราฟ 3D Isometric, 2D Bar Chart, Tooltip, รายละเอียดรายห้อง) ให้สะท้อนยอด "มาเข้าแถว" และ "ขาดแถว" อย่างแม่นยำ 100%
- **Modern Left Sidebar Layout & Full-Width Viewport**:
  - ปรับเลย์เอาต์เป็น Left Sidebar อัจฉริยะ (ย่อ/ขยายได้, โหมดไอคอนบนแท็บเล็ต/เดสก์ท็อป)
  - ขยายหน้าจอแบบ Fluid Container ใช้พื้นที่หน้าจอได้เต็มประสิทธิภาพ
- **ระบบอัปโหลดรูปโปรไฟล์ & Student Portal**:
  - รองรับการเปลี่ยนรูปโปรไฟล์ผ่านการอัปโหลดไฟล์ตรงหรือป้อน URL รูปภาพ
  - ระบบพอร์ทัลนักเรียน (`/portal`) และระบบตัดเกรดกิจกรรมพัฒนาผู้เรียน (`/grades`)

### [v1.4.1] - 28 ตุลาคม 2569
- Release v1.4.1: ปรับแต่งระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน

### [v1.4.0] - 28 ตุลาคม 2569
- Feature: เพิ่มระบบกราฟสถิติแบบ 3D มีมิติ (3D Isometric Attendance & 3D Extruded Donut) พร้อมสลับโหมด 3D/2D

### [v1.3.1] - 28 ตุลาคม 2569
- Improve: เพิ่มระบบ Authentication Session Role-based (NextAuth v5) และตัวกรองห้องเรียนของครูที่ปรึกษา

### [v1.3.0] - 28 ตุลาคม 2569
- Feature: เพิ่มระบบนำเข้าข้อมูลนักเรียนแบบกลุ่มผ่านไฟล์ Excel/CSV (Bulk Import) และระบบพอร์ทัลนักเรียน

### [v1.2.0] - 28 ตุลาคม 2569
- Release v1.2.0: แยกสัดส่วนระบบหน้าบ้าน (Front-Office) และศูนย์ควบคุมระบบหลังบ้าน (Back-Office `/admin` พร้อมเมนู Sidebar 5 หมวดหมู่), เพิ่มระบบปรับโหมดพื้นหลัง กลางวัน/กลางคืน 6 โทนสี และรองรับทุกแพลตฟอร์ม (Mobile/Tablet/Desktop PWA)

### [v1.1.0] - 28 ตุลาคม 2569
- Release v1.1.0: เพิ่มระบบจัดการหลังบ้าน (CRUD ทะเบียนนักเรียน, ห้องเรียน, สิทธิ์ผู้ใช้งาน `TEACHER`/`ADMIN`, และจัดการประวัติเช็คชื่อรายวัน) พร้อมตั้งค่าพอร์ต `3088` ป้องกันพอร์ตชนกัน

### [v1.0.0] - 28 ตุลาคม 2569
- Release v1.0.0: เปิดตัวระบบเช็คชื่อเข้าแถวประจำวัน (`/attendance/check`), ระบบรายงานนักเรียนต่ำกว่าเกณฑ์ 80% และอนุมัติกิจกรรมแก้แถว (`/attendance/remedial`), และแดชบอร์ดสถิติภาพรวม (`/dashboard`)
