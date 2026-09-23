
# Gemini File Commander 🧠🗂️
### مدير ملفات ذكي 100% برايفت - لا يرفع محتوى الملفات أبداً

**المبدأ الذهبي:** نرسل لـ Gemini فقط JSON ميتاداتا: {name, path, source, created, last_opened, opens, size, hash}
لا صورة، لا PDF، لا محتوى. هذا هو الصح.

## ✅ ما تم بناؤه
- واجهة عصرية بـ 3D emojis و Glassmorphism (Cairo font + Space Grotesk)
- شاشة إدخال API Key أول مرة (محفوظ localStorage فقط)
- دعم أحدث نماذج Gemini (مؤكد من البحث):
  - `gemini-3.8-flash` - newest for agentic workflows GA 2026-09-02
  - `gemini-3.6-flash` - balanced GA 2026-07-21
  - `gemini-3.5-flash-lite` - cheapest GA 2026-07-21
- نظام صلاحيات:
  - 🟡 جزئية (افتراضي): يجمع الملفات في طابور انتظار وينتظر إذنك
  - 🔴 كاملة: يحذف مباشرة وينقل لسلة مهملات 30 يوم قابلة للاسترجاع
- صائد الملفات منتهية الصلاحية: يفحص Download + Screenshots + WhatsApp + tmp
- إعادة تسمية زمنية ذكية: يرتب الصور/الفيديوهات حسب الترتيب الزمني بدون رفع: YYYY-MM-DD_HH-MM_SS
- تعلم من المستخدم: كلما قلت "احتفظ" يتعلم النوع ده مهم
- مستويات ثقة: 🟢 آمن (tmp, log, cache) - 🟡 اسألني - 🔴 محظور (بطاقات، صور عائلية كثيرة الفتح)

## 🏗️ الهيكل للمبرمج الذكي (Android Builder AI)
اقرأ ملف: `BUILD_INSTRUCTIONS_FOR_ANDROID_AI.txt` - فيه كل ما تحتاجه لبناء APK بمتطلبات Android 16.

## 📱 كيف يعمل في الأندرويد الحقيقي
في WebView الحالي المحاكي MOCK_FILES، في الأندرويد الحقيقي:
1. Native bridge عبر `addJavascriptInterface` يمرر قائمة الملفات من Java: File.listFiles + MediaStore + UsageStatsManager (last_opened, opens)
2. JS يحسب SHA256 محلياً للكشف عن المكررات (بدون رفع)
3. يبني metadata JSON ويرسله لـ Gemini API
4. Gemini يرجع {action, reason, expiry_score, trust, new_name, folders_to_create}
5. حسب الصلاحية: إما طابور أو حذف مباشر

## 🔒 الأمان
- MANAGE_EXTERNAL_STORAGE + READ_MEDIA_* + PACKAGE_USAGE_STATS
- سلة مهملات 30 يوم
- لا يلمس أبداً ملفات trust=red
- API Key لا يخرج من الجهاز

## 🚀 تشغيل سريع
افتح www/index.html في المتصفح، ضع مفتاح API، جرب.

## 📦 للـ APK
المشروع جاهز كـ WebView app - فقط اقرأ BUILD_INSTRUCTIONS_FOR_ANDROID_AI.txt
