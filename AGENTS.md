# AGENTS.md - Quy tắc và Hướng dẫn cho AI Agent

Tệp này chứa các chỉ dẫn quan trọng mà các AI Agent (Antigravity, Gemini, Claude, Cursor, Codex, v.v.) sẽ **đọc đầu tiên** khi làm việc trong dự án **ProMedi (Hệ thống Kiosk Khám Sức Khoẻ Tự Động - Kiosk Sumi mini K2 / Sunmi K2 mini)**.

---

## 📖 Tài liệu Kiến trúc & Đọc Docs trước khi Code (Mandatory Docs Reading)

- **Quy tắc đọc Docs bắt buộc**: Trước khi làm bất kỳ tính năng mới hoặc chỉnh sửa/refactor feature cũ, Agent **BẮT BUỘC phải đọc thư mục `docs/` trước tiên**, đặc biệt là:
  - [usecase-specification-v4.0.md](./docs/specs/usecase-specification-v4.0.md) — **Đặc tả Use Case Nghiệp vụ V4.0** (User Flow Màn 0-5, BPBIO 750, InBody 270/380, Silent Mode & Voice Matrix, Exception Code Handler).
  - [ARCHITECTURE_PROPOSAL_PRODUCTION.md](./docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md) — Kiến trúc 4 lớp, Deep Engines, HAL.
  - [CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) — Tiêu chuẩn viết code sạch và nhất quán.
- **Tham khảo Bộ Skills Tối Ưu Hiệu Năng & Kiến Trúc Tổng Thể (Vercel Standards)**:
  - Khi phân tích, thiết kế kiến trúc hoặc tối ưu hiệu năng hiển thị / native, **BẮT BUỘC tham khảo 2 bộ skills sau**:
    1. [vercel-react-best-practices](file:///d:/promedi/.agents/skills/vercel-react-best-practices/SKILL.md): Tối ưu hiệu năng React, chống re-render thừa, triệt tiêu Async Waterfalls, tối ưu bundle size và client data fetching.
    2. [vercel-react-native-skills](file:///d:/promedi/.agents/skills/vercel-react-native-skills/SKILL.md): Tối ưu hiệu năng React Native & Expo trên thiết bị di động/Kiosk (FlashList, Reanimated GPU 60fps animations với `transform`/`opacity`, tối ưu bộ nhớ hình ảnh và quản lý Native Modules).
- **Kích hoạt Skill `grill-me` để Thảo luận (Interactive Interview)**: Với các tính năng mới, nâng cấp hay sửa đổi có mâu thuẫn/quyết định kiến trúc chưa rõ ràng, Agent **tùy từng trường hợp phải tự động kích hoạt skill `grill-me` (`grilling`)** để phỏng vấn và thống nhất cây thiết kế (Design Tree) với người dùng trước khi tiến hành code.

---

## 📚 Chuẩn Mực Tài Liệu 3 Tầng (3-Tier Documentation Framework)

Mọi tài liệu trong dự án được tổ chức chặt chẽ theo 3 nhóm phân cấp rõ ràng:

```
[Nhóm 1: Module README] (Cục bộ tại thư mục mã nguồn: src/features/<feature>/README.md, src/core/<module>/README.md)
       │
       ▼
[Nhóm 2: Kế hoạch & Runbook] (Triển khai & nghiệm thu trên máy thật: docs/plans/*.md)
       │
       ▼
[Nhóm 3: Đặc tả Kiến trúc & ADR] (Toàn cục: docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md, docs/specs/*.md)
```

### 🏷️ Nhóm 1: README của từng Mô-đun (Module README)

- **Vị trí**: Đặt trực tiếp tại thư mục chứa code (VD: `src/features/measure-inbody/README.md`, `src/core/hardware/README.md`, `src/core/voice-engine/README.md`).
- **Mục đích**: Hướng dẫn nhà phát triển và AI Agent nắm bắt nhanh chức năng, danh mục tệp, các quyết định thiết kế cốt lõi và cách chạy kiểm thử mà không cần đọc tràn lan.
- **Bố cục tiêu chuẩn bắt buộc**:
  1. `# <Tên_Mô_Đun>`: Tên mô-đun kèm 1 câu mô tả ngắn gọn chức năng lõi.
  2. `⚠️ Đoạn Cảnh báo & Phân biệt`: Làm rõ điểm khác biệt của mô-đun này với các mô-đun khác (VD: _InBody đo thành phần cơ thể qua cổng Serial/BLE, phân biệt với Máy đo huyết áp_).
  3. `Danh sách Tham chiếu (Reference Links)`: Đường dẫn tương đối tới các file spec, API docs, hoặc route liên quan.
  4. `## 1. Đang có gì (Bảng danh mục tệp)`: Bảng Markdown 3 cột (**Tệp | Trách nhiệm | Chạm Vào/Ra (I/O)**). Phân biệt rõ ràng:
     - ❌ **Logic thuần**: Chạy unit test độc lập 100%, zero I/O (`utils/*.ts`, `calculator.ts`).
     - ⚠️/🌐 **Chạm Vào/Ra (I/O)**: Gọi phần cứng (`hardware adapters`, native modules), phát âm thanh giọng nói (`voice player`), gọi mạng REST API (`api/*.ts`), hoặc đọc ghi SQLite.
  5. `## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)`: Liệt kê các quyết định kiến trúc quan trọng (chuẩn giao tiếp thiết bị y tế, bộ đếm ngược timeout 60s, định dạng giọng nói, luồng dọn dẹp dữ liệu tạm...).
  6. `## 3. Hướng dẫn kiểm thử & Chạy lệnh`: Các lệnh thực thi kiểm tra (`npx jest ...`, `npx tsc --noEmit`, `npm run lint`).

---

### 📋 Nhóm 2: Tài liệu Kế hoạch Triển khai & Kỹ thuật (Execution Plan & Hardware Runbook)

- **Vị trí**: `docs/plans/*.md` (VD: `docs/plans/identification-runbook.md`).
- **Mục đích**: Hướng dẫn quy trình từng bước (Step-by-step) để cài đặt, kết nối thiết bị y tế và nghiệm thu trên phần cứng thật (Kiosk Sumi/Sunmi mini K2, InBody 260S, Máy đo huyết áp).
- **Bố cục tiêu chuẩn bắt buộc**:
  1. `Phần Đầu trang (Header Metadata)`:
     - `- **Thời gian tạo (Created)**: YYYY-MM-DD HH:mm:ss (GMT+7)`
     - `- **Cập nhật lần cuối (Last Updated)**: YYYY-MM-DD HH:mm:ss (GMT+7)`
     - `- **Trạng thái**: ĐÃ HOÀN THÀNH / ĐANG THỰC HIỆN`
     - `- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + InBody 260S + Máy đo huyết áp`
  2. `## 1. Mục tiêu`: Đặt vấn đề và mục tiêu chính cần đạt trong đợt triển khai.
  3. `## 2. Hiện trạng mã nguồn & Đã xử lý`: Tóm tắt trạng thái code TypeScript, native module kết nối cổng COM/Serial/Bluetooth, và các lỗi đã xử lý.
  4. `## 3. Hướng dẫn thực thi từng bước (Step-by-Step)`: Chia làm các tiểu mục. Mỗi bước cung cấp:
     - Lệnh chạy hoặc thao tác trên màn hình Kiosk / máy đo.
     - **Tiêu chí đạt (Acceptance Criteria)**: Kết quả cụ thể để xác nhận bước đó thành công.
  5. `## 4. Danh mục Kiểm tra nhanh (Checklist)`: Danh sách ô tích (`- [x]` hoặc `- [ ]`) giúp QA/kỹ thuật viên rà soát đầy đủ.

---

### 🏛️ Nhóm 3: Tài liệu Đặc tả Kiến trúc Hệ thống & Design Rationale (Architecture Spec & ADR)

- **Vị trí**: `docs/specs/*.md`, `docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md`.
- **Mục đích**: Quy định luồng dữ liệu, ranh giới trách nhiệm giữa các phân lớp, lược đồ cơ sở dữ liệu WatermelonDB / API Contracts, và lý giải tường tận lý do thiết kế.
- **Bố cục tiêu chuẩn bắt buộc**:
  1. `Phần Ranh giới Trách nhiệm (Scope & Boundaries)`: Tuyên bố rõ mô-đun **LÀM GÌ** và **KHÔNG LÀM GÌ** để giữ kiến trúc 4 lớp sạch sẽ.
  2. `## 1. Đường ống & Luồng dữ liệu (Sơ đồ Mermaid Pipeline / Sequence / FSM)`: Sơ đồ trực quan biểu diễn quy trình khám 6 bước và chuyển trạng thái.
  3. `## 2. Bảng Cấu trúc Dữ liệu & API Payloads`: Chi tiết Schema, TypeScript Types (chỉ số InBody, Huyết áp, Thông tin định danh) và ý nghĩa.
  4. `## 3. Giải trình Lý do Thiết kế (Design Rationale / HOW & WHY)`: Trả lời các câu hỏi kỹ thuật hóc búa (Bảo vệ dữ liệu riêng tư khách hàng bằng đếm ngược 60s, Voice Prompt Queue, Tách biệt Mock vs Native HAL...).

---

## 📌 Tổng quan & Công nghệ (Tech Stack)

- **Tên dự án**: ProMedi - Hệ Thống Kiosk Khám Sức Khoẻ Tự Động
- **Thiết bị triển khai**: **Kiosk Sumi mini K2** (Sunmi K2 mini - Màn hình cảm ứng lớn, Máy in nhiệt tích hợp, Loa ngoài)
- **Thiết bị y tế tích hợp**:
  - **InBody 260S**: Máy phân tích thành phần cơ thể (Body Composition Analyzer)
  - **Máy đo huyết áp tự động**: Đo huyết áp tâm thu, tâm trương, nhịp tim
- **Công nghệ chính**:
  - **Framework**: React Native + Expo (SDK 54+) + Expo Router
  - **State Machine**: XState v5 (Pure Actors điều phối luồng khám tuyến tính 6 bước & Timeout)
  - **Database & Local Storage**: WatermelonDB (SQLite local storage, offline-first) + MMKV
  - **State & Data Fetching**: TanStack React Query v5 + Valibot
  - **Forms & Validation**: `react-hook-form` + `valibot` + `@hookform/resolvers`
  - **Styling**: NativeWind (Tailwind CSS)
  - **Hệ thống giọng nói (Voice Guidance)**: Audio Player / TTS Engine (`src/core/voice-engine/`)
  - **Native Modules / Hardware HAL**: Hardware Abstraction Layer (`src/core/hardware/`)

---

## 🏗️ Kiến trúc 4 Lớp (4-Layer System Architecture)

Mọi code mới hoặc refactor cần đặt đúng vào phân lớp tương ứng:

```
[Layer 1: src/app/] (Routing & Context Shells - KHÔNG chứa business logic)
       │
       ▼
[Layer 3: src/features/] (UI Screens & Feature Components)
       │
       ▼
[Layer 2: src/core/] (Business Logic Engines, XState Machines, Hardware Ports & Adapters, Voice Engine)
       │
       ▼
[Layer 4: src/shared/] (Design System UI, Virtual Numpad, Countdown Timer, Axios Client, Types, Utils, Constants)
```

### Quy tắc Phụ thuộc (Boundary Rules) & Tệp Barrel Index (`index.ts`):

1. `src/core/` **TUYỆT ĐỐI CẤM** import từ `src/features/` hoặc `src/app/`.
2. `src/shared/` **TUYỆT ĐỐI CẤM** import từ `src/core/`, `src/features/`, hoặc `src/app/`.
3. **Bắt buộc dùng Tệp Barrel (`index.ts`) ở 2 cấp (Subfolder & Feature Root Barrels)**:
   - **Cấp thư mục con (Subfolder Barrels)**: Tất cả các thư mục con trong một feature (`components/`, `api/`, `validations/`, `types/`, `constants/`, `utils/`) **BẮT BUỘC có tệp `index.ts`** để gom và re-export toàn bộ tài nguyên bên trong (VD: `export * from './identification.schema'`).
   - **Cấp Root Feature (`index.ts`)**: Tệp `src/features/<feature>/index.ts` chỉ re-export gọn gàng qua các subfolder barrels (VD: `export * from './components'`, `export * from './validations'`, `export * from './api'`).
   - **Quy tắc Import từ Bên ngoài**: Callers bên ngoài module **chỉ được phép import qua Barrel File (`index.ts`)** của module đó. **TUYỆT ĐỐI CẤM** import đường dẫn lắt nhắt trỏ trực tiếp đến tệp sâu trong thư mục con (VD: cấm `import { ... } from '@/features/identification/validations/identification.schema'`).

---

## ⚡ Quy tắc bắt buộc cho AI Agent (Strict Guidelines)

### 1. Navigation & Route Parameter Rules (Quy tắc Điều hướng & Tham số Route)

- **KHÔNG gọi `useRouter()` hoặc `useLocalSearchParams()` trực tiếp trong màn hình**:
  - Bắt buộc dùng Custom Hooks chuẩn từ `@/shared/hooks`: **`useAppNavigation()`** và **`useAppParams('ROUTE_NAME')`**.
- **Tự động Parse JSON Params**:
  - `useAppParams()` tự động nhận diện và `JSON.parse` các tham số Object / Array dạng chuỗi. **CẤM viết try/catch hay JSON.parse thủ công trong màn hình UI**.
  - `hrefToRoute` trong `routes.const.ts` tự động `JSON.stringify` các tham số Object / Array khi dựng Query String.
- **Đặt tên file Route tĩnh sạch sẽ**:
  - Đặt tên route rõ ràng theo từng bước của Kiosk:
    - `/kiosk/home` (Bước 1: Trạng thái chờ / Home)
    - `/kiosk/identification` (Bước 2: Màn hình / Popup Định danh Họ tên & Số CCCD 12 số)
    - `/kiosk/service-selection` (Bước 3: Màn hình Chọn dịch vụ)
    - `/kiosk/measure-inbody` (Bước 4: Đo chỉ số cơ thể InBody 260S)
    - `/kiosk/measure-bp` (Bước 5: Đo huyết áp tự động)
    - `/kiosk/result-summary` (Bước 6: Màn hình Tổng hợp Kết quả)
- **KHÔNG tạo biến tạm rườm rà cho Domain Object**:
  - Truy cập trực tiếp thuộc tính của Domain Object (`inBodyData?.bodyFatPercentage`, `bpData?.systolic`, `customer?.phone`) ngay trong JSX expression.

### 2. Hardware Ports & Adapters (Tách biệt phần cứng & Thiết bị Y Tế)

- **KHÔNG gọi trực tiếp Native Module, cổng Serial, Bluetooth hay phần cứng trong React UI Components**.
- Mọi tương tác phần cứng (InBody 260S, Máy đo huyết áp, Máy in Kiosk Sunmi, Loa/Voice Guidance) phải đi qua Interface Contract (`IDeviceManager`, `IInBodyDevice`, `IBloodPressureDevice`, `IPrinterDevice`) tại `src/core/hardware/`.
- Phải có 2 bộ Adapters: `NativeDeviceAdapter` (chạy trên Kiosk Android thực tế kết nối thiết bị thật) và `MockDeviceAdapter` (chạy trên Web/Simulator dev để giả lập luồng đo và trả dữ liệu mẫu).

### 3. Voice Guidance Engine (Hệ thống Hướng dẫn Giọng nói)

- Toàn bộ âm thanh / giọng nói hướng dẫn được phát thông qua **`VoiceEngine`** (`src/core/voice-engine/`).
- Khi người dùng chuyển bước hoặc hoàn thành đo, State Machine hoặc Hook sẽ kích hoạt voice cue tương ứng.
- Phải hỗ trợ cơ chế ngắt lời thoại cũ khi người dùng chuyển bước nhanh (cancel previous audio before playing new prompt) để tránh chồng chéo âm thanh.

### 4. Quy chuẩn API: 1 File = 1 Endpoint & Naming Conventions

- Mỗi API Call (Query hoặc Mutation) phải được đóng gói độc lập trong **1 file duy nhất** tại `src/features/<feature>/api/<verb-noun>.ts` (VD: `save-health-record.ts`, `get-customer-profile.ts` — **CẤM dùng tiền tố `use-` cho tên file**).
- **Quy chuẩn Đặt tên Symbol**:
  - Custom Hook: `useGetCustomerProfile`, `useSaveHealthRecord`.
  - Fetcher function: `getCustomerProfileFetcher` (private).
  - Query Key: `getCustomerProfileQueryKey` (export).
  - Query Options: `getCustomerProfileQueryOptions` (export/private).
- **Chỉ export những gì cần thiết**:
  - Chỉ export Custom Hook và Query Key. Giữ fetcher, request params và response interface nội bộ trong file API trừ khi có nhu cầu dùng chung.

### 5. Quy tắc Phạm vi Type & Interface (3-Tier Scope Rule)

Tuân thủ nghiêm ngặt nguyên tắc phạm vi 3 cấp cho Types và Interfaces:

1. **Cấp 1 - Cục bộ file (Co-located / File-Private Scope)**:
   - Nếu interface/type **chỉ dùng duy nhất trong 1 file** (VD: props của 1 component nhỏ, schema payload nội bộ của 1 API file) $\rightarrow$ **Định nghĩa trực tiếp trong file đó**. KHÔNG tạo file riêng lắt nhắt.
2. **Cấp 2 - Dùng chung trong 1 Feature (Feature Scope)**:
   - Nếu interface/type **được dùng qua lại giữa các file trong cùng 1 feature** $\rightarrow$ Đặt tại `src/features/<feature>/types/<domain>.types.ts` và export qua barrel file `src/features/<feature>/index.ts`.
3. **Cấp 3 - Dùng chung toàn hệ thống (Global / Shared Scope - Type Hoisting)**:
   - Khi có **từ 2 features trở lên** sử dụng chung một Type, hoặc là cấu trúc Core Domain Model (`CustomerIdentification`, `InBodyMetrics`, `BloodPressureMetrics`, `HealthSessionData`, `PaginatedResponse`, `ApiErrorResponse`) $\rightarrow$ **BẮT BUỘC nâng (hoist) Type đó lên `src/shared/types/`**.

- **Shared Mock Dataset**:
  - Dữ liệu Mock dùng cho dev & simulator đặt tại `src/shared/mock/<domain>.mock.ts` và export qua `@/shared/mock`.
  - **CẤM re-export tệp mock data trong thư mục `data/` của feature**.

### 6. Quy tắc Biểu mẫu (Forms) & Schema Validation

- **Bắt buộc dùng `react-hook-form`**:
  - Mọi luồng nhập liệu biểu mẫu (nhập SĐT, CCCD, thông tin tuổi, giới tính, thông số tùy chỉnh) **BẮT BUỘC sử dụng `react-hook-form`** kết hợp với `@hookform/resolvers`.
  - **TUYỆT ĐỐI CẤM** quản lý form state thủ công bằng nhiều biến `useState` rời rạc trong component.
- **Tách biệt Schema Validation & Tree-Shaking Named Imports**:
  - Toàn bộ validation schema (sử dụng **`valibot`**) phải được tách thành file riêng biệt và đặt trong thư mục **`validations/`** của feature đó:
    - `src/features/<feature>/validations/<form-name>.schema.ts` (VD: `src/features/identification/validations/identification.schema.ts`).
  - **Bắt buộc dùng Named Imports cho `valibot` (Tree-Shaking Standard)**:
    - BẮT BUỘC dùng named imports: `import { object, pipe, string, minLength, regex, type InferOutput } from 'valibot'`.
    - **TUYỆT ĐỐI CẤM** sử dụng wildcard import (`import * as v from 'valibot'`) để đảm bảo tối ưu bundle size và bộ nhớ RAM Kiosk theo chuẩn Vercel React Best Practices.
  - **Type Inference từ Schema**:
    - Sử dụng `InferOutput<typeof formSchema>` hoặc `InferInput<typeof formSchema>` để suy luận Type của Form, **CẤM viết interface thủ công trùng lặp**.

- **Hiển thị lỗi thân thiện trên Kiosk**:
  - Thông báo lỗi validation phải hiển thị rõ ràng bên dưới trường nhập liệu với kích thước chữ lớn, độ tương phản cao, hỗ trợ cả phản hồi âm thanh hoặc rung (haptics) nếu nhập sai định dạng.

### 7. Quy tắc Hằng số (Constants), Tiện ích (Utils) & Pure Functions

- **Scope 3 cấp cho Constants & Utils**:
  - **Cục bộ (Local)**: Hằng số/hàm helper chỉ dùng trong 1 file $\rightarrow$ Đặt ở đầu file đó.
  - **Feature-level**: Dùng chung giữa các screens/components trong feature $\rightarrow$ Đặt tại `src/features/<feature>/constants/` và `src/features/<feature>/utils/`.
  - **Shared/Global**: Dùng trên toàn ứng dụng $\rightarrow$ Đặt tại `src/shared/constants/` và `src/shared/utils/`.
- **Pure Functions & Zero I/O trong `utils/`**:
  - Mọi hàm trong thư mục `utils/` **phải là Pure Functions** (deterministic, không side-effects, 100% testable độc lập, không gọi phần cứng/API/async storage).
- **Tránh Magic Numbers & Magic Strings**:
  - Gom các giá trị cố định (Timeout đếm ngược `60` giây, dải BMI chuẩn, Baudrate cổng COM, Regex kiểm tra SĐT/CCCD, Audio Cue IDs) vào hằng số với tên `SCREAMING_SNAKE_CASE` hoặc `as const` object.

### 8. Quy tắc Thiết kế UI/UX Kiosk & Bảo vệ Quyền riêng tư (Kiosk Interaction Standards)

- **Giao diện chạm Kiosk (Touch-First & Big Targets)**:
  - Nút bấm, bàn phím số (Numpad) có kích thước lớn, màu sắc tương phản cao, dễ dàng tương tác ở khoảng cách đứng.
- **Bảo mật & Quyền riêng tư (Privacy Countdown Timer)**:
  - Màn hình Tổng hợp kết quả (Bước 6) **bắt buộc có bộ đếm ngược 60 giây**.
  - Khi hết 60s hoặc khi nhấn "KẾT THÚC", hệ thống phải tự động xóa toàn bộ dữ liệu tạm thời của phiên khám (Session Clear) và quay về Màn hình Home (Bước 1).
- **Shimmer Skeleton Loading**:
  - Trạng thái nạp dữ liệu ban đầu (`isLoading === true`) **bắt buộc dùng Base Component `<Shimmer />`** thay vì spinner nguyên thủy.
- **Toast Notifications**:
  - Thông báo lỗi/cảnh báo **bắt buộc dùng `toast.warning()` / `toast.error()`** từ `@/shared/store`. **CẤM dùng `Alert.alert` native mặc định của React Native**.

### 9. Quy tắc Tối ưu Hiệu năng & Trải nghiệm Mượt mà (Performance & Mobile Standards)

Tuân thủ nghiêm ngặt các nguyên tắc từ bộ kỹ năng `vercel-react-best-practices` và `vercel-react-native-skills`:

- **Triệt tiêu Async Waterfalls (`async-parallel`)**:
  - Dùng `Promise.all()` hoặc chạy song song các tác vụ I/O độc lập (VD: đọc trạng thái máy InBody và máy đo huyết áp cùng lúc thay vì `await` tuần tự).
- **Kiểm soát Re-render & Inline Objects**:
  - Ổn định callback handlers (`useCallback`), memoize danh sách items phức tạp.
  - Tránh truyền inline style object hoặc inline arrow functions trong render loops để giảm tải Garbage Collection (GC) trên Kiosk chạy 24/7.
- **Tối ưu Danh sách cuộn (List Performance)**:
  - Danh sách lớn hoặc động bắt buộc dùng **`FlashList`** (`@shopify/flash-list`) kết hợp `estimatedItemSize`.
- **Hiệu ứng Mượt 60fps trên GPU (Animation Rules)**:
  - Toàn bộ animation phải thực hiện qua **React Native Reanimated**, chỉ animate các thuộc tính GPU-accelerated: `transform` và `opacity`. Tuyệt đối không animate layout properties (`width`, `height`, `margin`) gây drop FPS.
- **Tối ưu Hình ảnh & Bộ nhớ (Image Optimization)**:
  - Sử dụng `expo-image` để hiển thị ảnh/GIF/video minh họa tư thế đứng InBody / đo huyết áp, luôn cấu hình caching để tránh rò rỉ bộ nhớ (memory leak).

### 10. Kiểm tra trước khi bàn giao

- Kiểm tra TypeScript strict mode: `npx tsc --noEmit` (**0 Errors**)
- Kiểm tra Linter: `npm run lint` (**0 Errors**)

---

## 📖 Tham chiếu Nghiệp vụ & Luồng Khám (Business Logic & Spec References)

> ⚠️ **Quy tắc quan trọng**: Toàn bộ đặc tả nghiệp vụ chi tiết, kiến trúc FSM 2 lớp, ma trận giọng nói và kịch bản ngoại lệ **được quản lý tập trung tại thư mục `docs/`**.
>
> 📌 **AI Agent BẮT BUỘC đọc trực tiếp các tài liệu này trước khi lập trình hoặc refactor**:
>
> - **Kiến trúc FSM 2 Lớp (Session Orchestrator & Device Adapter)**: [fsm-2-layer-architecture.md](./docs/specs/fsm-2-layer-architecture.md) _(Quy định 2 lớp tách biệt, Registry, Config & Enforce rules)_.
> - **Đặc tả Use Case Nghiệp vụ V4.0**: [usecase-specification-v4.0.md](./docs/specs/usecase-specification-v4.0.md) _(Bao gồm User Flow Màn 0-6, InBody 270/380, BPBIO 750, Silent Mode, Voice Matrix & Exception Handlers)_.
> - **Kiến trúc Sản xuất Production**: [ARCHITECTURE_PROPOSAL_PRODUCTION.md](./docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md) _(Bao gồm Deep Engines, HAL, WatermelonDB Schema)_.

---

## 🏛️ Cấu Trúc Thư Mục Chuẩn Core & Features

```
src/
├── app/                              # Layer 1: Expo Router routes
│   ├── (kiosk)/
│   │   ├── home.tsx                  # Bước 1: Home / Idle
│   │   ├── identification.tsx        # Bước 2: Nhập SĐT / CCCD
│   │   ├── service-selection.tsx     # Bước 3: Chọn dịch vụ
│   │   ├── measure-inbody.tsx        # Bước 4: Đo InBody 260S
│   │   ├── measure-bp.tsx            # Bước 5: Đo Huyết áp
│   │   └── result-summary.tsx        # Bước 6: Tổng kết & Countdown 60s
│   ├── _layout.tsx
│   └── index.tsx
├── core/                             # Layer 2: Domain Engines & Hardware
│   ├── health-session/
│   │   ├── machines/
│   │   │   └── health-session.machine.ts  # XState FSM 6 bước & Timeout
│   │   ├── hooks/
│   │   │   └── use-health-session.ts
│   │   └── index.ts
│   ├── voice-engine/
│   │   ├── voice-prompts.const.ts    # Bảng audio files & prompt texts
│   │   ├── voice-player.service.ts   # Audio player & queue manager
│   │   └── index.ts
│   └── hardware/
│   │   ├── ports/
│   │   │   ├── inbody.interface.ts   # Port contract InBody 260S
│   │   │   ├── bp-device.interface.ts# Port contract Máy đo huyết áp
│   │   │   └── printer.interface.ts  # Port contract Máy in Sunmi
│   │   ├── adapters/
│   │   │   ├── native/               # Android native serial/BLE adapters
│   │   │   └── mock/                 # Mock adapters cho simulator/web
│   │   └── device-manager.ts
├── features/                         # Layer 3: Feature UI components & flows
│   ├── identification/
│   │   ├── api/                      # 1 File = 1 API (e.g. check-customer.ts)
│   │   ├── components/               # VirtualNumpad, IdentityInputCard
│   │   ├── validations/              # Schemas Valibot (e.g. identification.schema.ts)
│   │   ├── constants/                # Feature-specific constants (e.g. ID_MODES)
│   │   ├── types/                    # Feature-specific types (dùng chung trong feature)
│   │   ├── utils/                    # Feature pure utils (e.g. cccd-parser.ts)
│   │   ├── identification-screen.tsx
│   │   └── index.ts                  # Feature Public API Barrel
│   ├── home/
│   ├── service-selection/
│   ├── measure-inbody/
│   ├── measure-bp/
│   └── result-summary/
└── shared/                           # Layer 4: Shared UI & Infrastructure
    ├── components/                   # Numpad, Countdown, Shimmer, Buttons
    ├── hooks/                        # useAppNavigation, useAppParams
    ├── types/                        # health.types.ts, api.types.ts (hoisted types)
    ├── validations/                  # Global shared schemas (e.g. common-rules.schema.ts)
    ├── constants/                    # System constants (e.g. TIMEOUT_SECS, ROUTES)
    ├── store/                        # toast, session cleanup
    └── utils/                        # Pure global utilities (formatters, math, date)
```
