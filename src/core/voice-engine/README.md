# Mô-đun Giọng Nói Hướng Dẫn (Voice Guidance Engine)

Mô-đun chịu trách nhiệm quản lý, điều phối và phát giọng nói hướng dẫn tiếng Việt tự động (`expo-speech`) theo từng bước khám sức khỏe trên Kiosk Sumi mini K2.

---

## ⚠️ Đoạn Cảnh báo & Phân biệt

- **Chỉ phục vụ Hướng dẫn Giọng nói (Voice Guidance)**: Mô-đun này độc lập với âm thanh cảnh báo còi bíp hay âm thanh hệ thống OS.
- **Tuân thủBR-VOICE-01 (Silent Mode)**: Màn 0 (Kích hoạt), Màn 1 (Idle video) và Màn 2 (Định danh) **im lặng tuyệt đối**. Âm thanh chỉ phát từ Màn 3 đến Màn 6.
- **Cơ chế Hủy Âm thoại cũ (Audio Queue Cancellation)**: Luôn hủy lời thoại đang phát trước khi phát câu thoại mới để tránh hiện tượng nói chồng chéo khi người dùng chuyển bước nhanh.

---

## Danh sách Tham chiếu (Reference Links)

- [Ma trận Giọng nói V4.0](file:///d:/promedi/docs/specs/usecase-specification-v4.0.md#4-bảng-ma-trận-giọng-nói--sự-kiện-mã-lỗi-voice--exception-matrix)
- [Kiến trúc FSM 2 Lớp](file:///d:/promedi/docs/specs/fsm-2-layer-architecture.md)

---

## 1. Bảng Danh mục Tệp (Directory Catalog)

| Tệp                                    | Trách nhiệm                                                                                                | Chạm Vào/Ra (I/O)                       |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
| `voice-prompts.const.ts`               | Khai báo hằng số danh sách câu thoại tiếng Việt chuẩn (`VOICE_PROMPTS`) & type `VoicePromptKey`.           | ❌ Logic thuần (Pure Constants)         |
| `voice-player.service.ts`              | Singleton `VoicePlayerService` đóng gói `expo-speech` (`speak`, `stop`, `speakText`, `speakHeightResult`). | 🌐 Call Expo Speech Native Audio Engine |
| `use-voice-guidance.ts`                | Custom Hook `useVoiceGuidance` lắng nghe `currentStep` và tự động phát audio cue tương ứng.                | 🌐 React Effect & Audio Player Call     |
| `utils/height-voice-formatter.util.ts` | Tiện ích chuyển đổi số đo chiều cao cm thành câu đọc ngữ pháp tiếng Việt hoàn chỉnh.                       | ❌ Logic thuần (Zero I/O, Pure Math)    |
| `index.ts`                             | Barrel File re-export toàn bộ tài nguyên mô-đun giọng nói.                                                 | ❌ Barrel Re-export                     |

---

## 2. Các Quyết Định Đã Chốt & Lý Giải Kỹ Thuật (HOW & WHY)

1. **Vì sao dùng `expo-speech` thay vì file MP3 tĩnh?**
   - Giúp giảm dung lượng ứng dụng (>50MB giảm xuống 0MB asset), linh hoạt tùy chỉnh tốc độ nói (`rate: 0.95`), độ cao (`pitch: 1.0`) và ngôn ngữ tiếng Việt (`vi-VN`).
2. **Xử lý cuộc gọi chồng chéo (Audio Overlapping):**
   - Phương thức `speak(key)` luôn gọi `await stop()` trước khi phát `Speech.speak()`, đảm bảo khi ngắt bước đo hoặc chuyển màn hình lập tức ngừng âm thanh cũ.
3. **Phát âm số đo chiều cao tự nhiên (`speakHeightResult`):**
   - Chuyển đổi chính xác các số nguyên và số thập phân thành từ tiếng Việt chuẩn ngữ pháp ("một trăm bảy mươi xăng ti mét", "một trăm sáu mươi lăm phẩy năm xăng ti mét", "mốt", "lăm", "lẻ"...), loại bỏ triệt để hiện tượng engine TTS đọc số kiểu tiếng Anh hoặc rời rạc.
4. **An toàn khi tháo gỡ (Unmount Safety):**
   - Các ngoại lệ phát sinh trên simulator hoặc thiết bị không có TTS đều được bao bọc bởi `try/catch` với log cảnh báo, không gây crash ứng dụng.

---

## 3. Hướng Dẫn Kiểm Thứ & Chạy Lệnh

- Kiểm tra TypeScript Strict Mode:
  ```bash
  npx tsc --noEmit
  ```
- Chạy Linter:
  ```bash
  npm run lint
  ```
