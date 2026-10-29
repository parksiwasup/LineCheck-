import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "รูปแบบคำขอต้องเป็น multipart/form-data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) เท่านั้น" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save into public/uploads/remedials or avatars
    const folderType = (formData.get("folder") as string) || "remedials";
    const subFolder = folderType === "avatars" ? "avatars" : "remedials";
    const uploadDir = path.join(process.cwd(), "public", "uploads", subFolder);
    await mkdir(uploadDir, { recursive: true });

    const originalName = file.name || "image.jpg";
    const ext = path.extname(originalName) || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : ".jpg";

    const prefix = subFolder === "avatars" ? "avatar" : "proof";
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${subFolder}/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error("Direct upload error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกรูปภาพลงเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}
